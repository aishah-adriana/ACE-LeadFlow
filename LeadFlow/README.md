Markdown
# ACE LeadFlow 🚀

**ACE LeadFlow** is a professional, full-stack CRM dashboard designed to manage academic leads across 13 specialized courses. It automates the process of importing data from Excel, merging duplicate interests, and tracking lead communication status.

## ✨ Key Features
* **Multi-Course Filtering:** Toggle between 13 programs (SO, OM, AIBL, CF, PM, OB, SP, FA, ME, TIL, SFBL, PMD, QM).
* **Smart Merge Logic:** Automatically combines interest from multiple sheets into one lead profile.
* **Status Toggle Cycle:** NEW ➔ UNCONTACTABLE ➔ CONTACTED ➔ REPLIED.
* **Deep-Scan Counter:** Select multiple leads for a detailed breakdown of counts per course.
* **GMT+8 Timestamp:** Specifically tracked for Malaysian Time (MYT).
* **Focus Mode:** "Show New Only" toggle to quickly clear through the daily backlog.

## 🛠️ Tech Stack
* **Frontend:** React.js, Vite, Lucide Icons
* **Backend:** Node.js (Express), TSX
* **Database:** SQLite (better-sqlite3)
* **Scripting:** Excel Office Scripts (TypeScript)

## 🚀 How to Run

### 1. Setup
Install the dependencies:
```bash
npm install
2. Launch the Application
Run the Server and the Dashboard in two different terminal tabs.

Terminal 1 (Backend):

Bash
npx tsx server.ts
Terminal 2 (Frontend):

Bash
npm run dev
3. Data Sync
Run the Office Script in your Excel file.

Copy the JSON output.

Click "Import Excel Data" on the dashboard and paste the code.

🔒 Data Privacy
The leadflow.db file is excluded from this repository via .gitignore to ensure lead information remains local.


---

### Then, push the update to GitHub:
Run these in your terminal to replace the old "Vite" description with your new one:
1. `git add README.md`
2. `git commit -m "Replace template README with project documentation"`
3. `git push`

**Now your GitHub page will actually look like YOUR project! Would you like me to show you how to add a "Screenshot" section to the README as well?**