package httpapi

import "database/sql"

func ensureImportTasks(db *sql.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS import_resume_job(id INTEGER PRIMARY KEY CHECK(id=1),user_id INTEGER NOT NULL,mode TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'active',error TEXT NOT NULL DEFAULT '')`)
	return err
}
func rememberImportTask(db *sql.DB, id int64, mode string) error {
	_, err := db.Exec(`INSERT INTO import_resume_job(id,user_id,mode) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,mode=excluded.mode,state='active',error='' WHERE import_resume_job.state<>'active'`, id, mode)
	return err
}
