import { storage } from './storage';
import { getDb } from './db';
import { sql } from 'drizzle-orm';

interface DataIntegrityReport {
  tableName: string;
  integrityStatus: string;
  recordCount: number;
  lastBackup: Date | null;
}

export class BackupService {
  private backupInterval: NodeJS.Timeout | null = null;

  // Start automated backup system
  startAutomatedBackups() {
    // Run backup every 6 hours
    this.backupInterval = setInterval(async () => {
      await this.performDailyBackup();
    }, 6 * 60 * 60 * 1000);

    // Perform initial backup
    this.performDailyBackup();
    console.log('Automated backup system started - running every 6 hours');
  }

  // Stop automated backups
  stopAutomatedBackups() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('Automated backup system stopped');
    }
  }

  // Perform comprehensive backup of critical data
  async performDailyBackup(): Promise<void> {
    try {
      console.log('Starting automated backup process...');
      
      const db = await getDb();

      // Execute the backup function
      await db.execute(sql`SELECT backup_critical_data()`);
      
      // Clean old backups (keep last 30 days)
      await db.execute(sql`
        DELETE FROM data_backups 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);
      
      console.log('Automated backup completed successfully');
    } catch (error) {
      console.error('Backup process failed:', error);
      
      // Create manual backup as fallback
      await this.manualBackupFallback();
    }
  }

  // Manual backup fallback if automated fails
  private async manualBackupFallback(): Promise<void> {
    try {
      console.log('Executing manual backup fallback...');
      
      const db = await getDb();

      // Backup recent chatbots
      const recentChatbots = await db.execute(sql`
        SELECT * FROM chatbots 
        WHERE updated_at >= NOW() - INTERVAL '24 hours'
      `);

      for (const chatbot of recentChatbots.rows) {
        await storage.createDataBackup({
          backupType: 'manual_fallback',
          tableName: 'chatbots',
          backupData: chatbot,
          checksum: require('crypto').createHash('sha256').update(JSON.stringify(chatbot)).digest('hex')
        });
      }

      console.log('Manual backup fallback completed');
    } catch (error) {
      console.error('Manual backup fallback also failed:', error);
    }
  }

  // Verify data integrity across all tables
  async verifyDataIntegrity(): Promise<DataIntegrityReport[]> {
    try {
      const db = await getDb();

      const result = await db.execute(sql`SELECT * FROM verify_data_integrity()`);
      
      return result.rows.map(row => ({
        tableName: row.table_name as string,
        integrityStatus: row.integrity_status as string,
        recordCount: parseInt(row.record_count as string),
        lastBackup: row.last_backup ? new Date(row.last_backup as string) : null
      }));
    } catch (error) {
      console.error('Data integrity verification failed:', error);
      return [];
    }
  }

  // Emergency data recovery
  async emergencyRestore(tableName: string, days: number = 1): Promise<boolean> {
    try {
      console.log(`Starting emergency restore for ${tableName} from last ${days} days`);
      
      const backups = await storage.getDataBackups(tableName, 100);
      const recentBackups = backups.filter(b => 
        new Date(b.createdAt).getTime() > Date.now() - (days * 24 * 60 * 60 * 1000)
      );

      let restoredCount = 0;
      for (const backup of recentBackups) {
        const success = await storage.restoreFromBackup(backup.id);
        if (success) restoredCount++;
      }

      console.log(`Emergency restore completed: ${restoredCount}/${recentBackups.length} records restored`);
      return restoredCount > 0;
    } catch (error) {
      console.error('Emergency restore failed:', error);
      return false;
    }
  }

  // Get backup status report
  async getBackupStatus(): Promise<{
    totalBackups: number;
    lastBackupTime: Date | null;
    integrityReport: DataIntegrityReport[];
    systemHealth: 'healthy' | 'warning' | 'critical';
  }> {
    try {
      const db = await getDb();

      const [backupCount] = await db.execute(sql`
        SELECT COUNT(*) as count FROM data_backups 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      const [lastBackup] = await db.execute(sql`
        SELECT MAX(created_at) as last_backup FROM data_backups
      `);

      const integrityReport = await this.verifyDataIntegrity();
      
      const systemHealth = this.assessSystemHealth(integrityReport, lastBackup.rows[0]?.last_backup);

      return {
        totalBackups: parseInt(backupCount.rows[0]?.count as string) || 0,
        lastBackupTime: lastBackup.rows[0]?.last_backup ? new Date(lastBackup.rows[0].last_backup as string) : null,
        integrityReport,
        systemHealth
      };
    } catch (error) {
      console.error('Failed to get backup status:', error);
      return {
        totalBackups: 0,
        lastBackupTime: null,
        integrityReport: [],
        systemHealth: 'critical'
      };
    }
  }

  // Assess overall system health
  private assessSystemHealth(integrityReport: DataIntegrityReport[], lastBackup: any): 'healthy' | 'warning' | 'critical' {
    if (!lastBackup) return 'critical';
    
    const lastBackupTime = new Date(lastBackup).getTime();
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    
    if (lastBackupTime < sixHoursAgo) return 'warning';
    
    const hasErrors = integrityReport.some(report => report.integrityStatus !== 'OK');
    if (hasErrors) return 'warning';
    
    return 'healthy';
  }
}

// Export singleton instance
export const backupService = new BackupService();
