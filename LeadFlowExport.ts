/**
 * ACE LeadFlow — Office Script for Excel (Web)
 *
 * HOW TO USE:
 * 1. Open your leads workbook in Excel for the Web
 * 2. Go to Automate tab → New Script
 * 3. Paste this entire file and click Save
 * 4. Click Run
 * 5. Copy the JSON printed in the script console
 * 6. Paste it into the ACE LeadFlow dashboard → Import Excel Data
 *
 * SHEET TABS: Each tab must be named exactly with the course code
 *   (SO, OM, AIBL, CF, PM, OB, SP, FA, ME, TIL, SFBL, PMD, QM, PE)
 *   Any other tab (e.g. "Compilation") is automatically skipped.
 *
 * COLUMN LAYOUT (1-indexed, matching your Excel sheet):
 *   Col M (13) = first_name
 *   Col N (14) = last_name
 *   Col O (15) = email
 *   Col P (16) = phone_number
 *   Col Q (17) = job_title
 *   Col R (18) = company_name
 *   Col V (22) = Status — background color determines outreach status:
 *       #92D050 → Contacted
 *       #F1A983 → Uncontactable
 *       #FF0000 → Duplicate
 *       #FFFF00 → New  (yellow = multi-course marker, status stays New)
 *       (no fill / other) → New
 */

function main(workbook: ExcelScript.Workbook) {

  // ── Course codes we recognise as valid sheets ──────────────────────────────
  const COURSE_CODES = new Set([
    'SO', 'OM', 'AIBL', 'CF', 'PM', 'OB', 'SP',
    'FA', 'ME', 'TIL', 'SFBL', 'PMD', 'QM', 'PE',
  ]);

  // ── Status priority for merging the same email across sheets ──────────────
  // Higher index = higher priority (wins when merging).
  const STATUS_PRIORITY: Record<string, number> = {
    New: 0,
    Duplicate: 1,
    Uncontactable: 2,
    Contacted: 3,
    Replied: 4,
  };

  // ── Column indices (0-based) ───────────────────────────────────────────────
  const COL_FIRST_NAME  = 12; // M
  const COL_LAST_NAME   = 13; // N
  const COL_EMAIL       = 14; // O
  const COL_PHONE       = 15; // P
  const COL_JOB_TITLE   = 16; // Q
  const COL_COMPANY     = 17; // R
  const COL_STATUS_CLR  = 21; // V  ← background color read from here

  // ── Color → status mapping (normalised to uppercase hex) ──────────────────
  function colorToStatus(hexColor: string): string {
    const c = hexColor.toUpperCase().replace(/^#/, '');
    if (c === '92D050') return 'Contacted';
    if (c === 'F1A983') return 'Uncontactable';
    if (c === 'FF0000') return 'Duplicate';
    // Yellow (#FFFF00) = multi-course marker — treat as New
    return 'New';
  }

  // ── Accumulator keyed by email ─────────────────────────────────────────────
  interface LeadRecord {
    name: string;
    email: string;
    phone_number: string;
    job_title: string;
    company: string;
    program: string[];   // collect all course codes, deduplicate later
    status: string;
  }

  const leadMap: Map<string, LeadRecord> = new Map();

  // ── Process each worksheet ─────────────────────────────────────────────────
  for (const sheet of workbook.getWorksheets()) {
    const tabName = sheet.getName().trim().toUpperCase();

    // Skip non-course sheets
    if (!COURSE_CODES.has(tabName)) {
      console.log(`Skipping sheet: "${sheet.getName()}"`);
      continue;
    }

    console.log(`Processing sheet: ${tabName}`);

    const usedRange = sheet.getUsedRange();
    if (!usedRange) {
      console.log(`  → Sheet is empty, skipping.`);
      continue;
    }

    const values = usedRange.getValues();
    const rowCount = values.length;

    // Row 0 is the header — start from row 1
    for (let r = 1; r < rowCount; r++) {
      const row = values[r];

      // Stop if email cell is empty
      const rawEmail = String(row[COL_EMAIL] ?? '').trim();
      if (!rawEmail) continue;

      const email = rawEmail.toLowerCase();

      // Build name from first + last, falling back gracefully
      const firstName = String(row[COL_FIRST_NAME] ?? '').trim();
      const lastName  = String(row[COL_LAST_NAME]  ?? '').trim();
      const name = [firstName, lastName].filter(Boolean).join(' ') || email;

      const phone    = String(row[COL_PHONE]     ?? '').trim();
      const jobTitle = String(row[COL_JOB_TITLE] ?? '').trim();
      const company  = String(row[COL_COMPANY]   ?? '').trim();

      // Read background color from the status column (col V) of this row
      // getCell uses 0-based row/col offsets relative to usedRange's top-left.
      // usedRange starts at row 0 of the sheet (row 1 = index 0).
      // The actual sheet row for data row r is r (0-based), so we use r directly
      // as the offset from the used range start (which includes the header).
      let statusColor = 'New';
      try {
        // We read cell color from the sheet directly to avoid offset confusion.
        // Sheet rows are 0-based in Office Scripts.
        const cell = sheet.getCell(r, COL_STATUS_CLR);
        const bg   = cell.getFormat().getFill().getColor();
        statusColor = colorToStatus(bg);
      } catch {
        // If the cell doesn't exist (e.g. column V is beyond used range), default to New
        statusColor = 'New';
      }

      // Merge into accumulator
      if (leadMap.has(email)) {
        const existing = leadMap.get(email)!;

        // Add course code if not already present
        if (!existing.program.includes(tabName)) {
          existing.program.push(tabName);
        }

        // Keep higher-priority status
        const existingPriority = STATUS_PRIORITY[existing.status] ?? 0;
        const newPriority      = STATUS_PRIORITY[statusColor]     ?? 0;
        if (newPriority > existingPriority) {
          existing.status = statusColor;
        }
      } else {
        leadMap.set(email, {
          name,
          email,
          phone_number: phone,
          job_title:    jobTitle,
          company,
          program: [tabName],
          status: statusColor,
        });
      }
    }
  }

  // ── Build final output array ───────────────────────────────────────────────
  const output = Array.from(leadMap.values()).map(lead => ({
    name:         lead.name,
    email:        lead.email,
    phone_number: lead.phone_number,
    job_title:    lead.job_title,
    company:      lead.company,
    program:      lead.program.join(', '),
    status:       lead.status,
  }));

  // ── Print to console (copy from the Excel script console pane) ────────────
  console.log('=== ACE LeadFlow Export ===');
  console.log(`Total leads: ${output.length}`);
  console.log('Copy the JSON below and paste into the dashboard Import panel:');
  console.log('');
  console.log(JSON.stringify(output));
}
