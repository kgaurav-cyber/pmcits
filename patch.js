const fs = require('fs');
const file = 'frontend/src/app/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace stats filtering
content = content.replace(/c\.status === 'Returned for Correction'/g, "c.claim_stage === 'Returned'");
content = content.replace(/c\.status === 'Paid'/g, "c.claim_stage === 'Paid'");
content = content.replace(/\['Submitted', 'Under Medical Review', 'Under Accounts Review', 'Approved by DDO', 'Treasury Processing'\]\.includes\(c\.status\)/g, "['Submitted', 'Medical Officer Review', 'Accounts Review', 'DDO Approval', 'Treasury Processing'].includes(c.claim_stage)");
content = content.replace(/\['Approved by DDO', 'Treasury Processing', 'Paid', 'Closed'\]\.includes\(c\.status\)/g, "['DDO Approval', 'Treasury Processing', 'Paid', 'Closed'].includes(c.claim_stage)");

// Replace selectedClaim.status
content = content.replace(/selectedClaim\.status/g, "selectedClaim.claim_stage");
content = content.replace(/claim\.status/g, "claim.claim_stage");

// Replace timeline item status and timestamp
content = content.replace(/item\.to_status/g, "item.stage");
content = content.replace(/item\.created_at/g, "(item.timestamp || item.created_at)");

// Replace specific string checks
content = content.replace(/'Returned for Correction'/g, "'Returned'");
content = content.replace(/'Under Medical Review'/g, "'Medical Officer Review'");
content = content.replace(/'Under Accounts Review'/g, "'Accounts Review'");
content = content.replace(/'Approved by DDO'/g, "'DDO Approval'");

fs.writeFileSync(file, content);
console.log('Dashboard patched successfully.');
