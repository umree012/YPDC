export const teams = ['Technical', 'Event Management', 'Media & Design', 'Operations & Logistics', 'Marketing & PR', 'Event Support & Discipline', 'Research & Innovation', 'General Member'];
export const fields = {
  name:'Full name', registrationId:'Registration ID', university:'University', department:'Department', program:'Degree program', studyLevel:'Study level', semester:'Semester / year', section:'Section', phone:'WhatsApp number', email:'University email', team:'Primary team', secondTeam:'Second preference', role:'Preferred role', skills:'Skills & interests', tools:'Tools / software', portfolio:'Portfolio link', hours:'Weekly availability', motivation:'Why YPDC?', experience:'Previous society experience', outside:'Applied to a society outside this university?', outsideDetails:'Outside society and application outcome', leadership:'Leadership experience / approach', conflict:'Handling disagreement', consent:'Recruitment consent'
};
const required = ['name','registrationId','university','department','program','studyLevel','semester','section','phone','email','team','role','skills','hours','motivation','outside'];
export function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Please complete the application form.');
  const data = {};
  for (const key of Object.keys(fields)) {
    if (key === 'consent') continue;
    if (input[key] != null && typeof input[key] !== 'string') throw new Error(`Check ${fields[key]}.`);
    data[key] = (input[key] || '').trim();
    const limit = ['skills','motivation','experience','outsideDetails','leadership','conflict'].includes(key) ? 1500 : key === 'portfolio' ? 500 : 160;
    if (data[key].length > limit) throw new Error(`${fields[key]} is too long.`);
  }
  for (const key of required) if (!data[key]) throw new Error(`${fields[key]} is required.`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Enter a valid email address.');
  if (!/^\+?[0-9 ()-]{10,20}$/.test(data.phone)) throw new Error('Enter a valid WhatsApp number.');
  if (!teams.includes(data.team) || (data.secondTeam && !teams.includes(data.secondTeam))) throw new Error('Choose a listed team.');
  if (data.team === data.secondTeam) throw new Error('Choose a different second preference.');
  if (!['Member','Deputy','Co-Lead'].includes(data.role)) throw new Error('Choose a listed role.');
  if (data.team === 'General Member' && data.role !== 'Member') throw new Error('General Member applicants must select Member.');
  if (!['Undergraduate','Postgraduate','Other'].includes(data.studyLevel)) throw new Error('Choose your study level.');
  if (!['1–3 hours','4–6 hours','7–10 hours','10+ hours'].includes(data.hours)) throw new Error('Choose your weekly availability.');
  if (!['Yes','No'].includes(data.outside)) throw new Error('Answer the outside-society question.');
  if (data.outside === 'Yes' && !data.outsideDetails) throw new Error('Tell us which outside society you applied to.');
  if (data.outside === 'No') data.outsideDetails = '';
  if (data.role !== 'Member' && (!data.leadership || !data.conflict)) throw new Error('Complete both leadership questions.');
  if (data.role === 'Member') {data.leadership = ''; data.conflict = '';}
  if (data.portfolio) { try { const u = new URL(data.portfolio); if (!['http:','https:'].includes(u.protocol)) throw new Error(); } catch { throw new Error('Use an https:// or http:// portfolio link.'); } }
  if (input.consent !== true) throw new Error('Please agree to the recruitment consent statement.');
  data.consent = true;
  return data;
}
