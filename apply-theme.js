const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const targetFiles = walk(path.join(__dirname, 'src', 'app', '(dashboard)'))
  // exclude the ones we explicitly rewrote
  .filter(f => !f.includes('dashboard\\page.tsx') && 
               !f.includes('leads\\page.tsx') && 
               !f.includes('leads\\[id]\\page.tsx') && 
               !f.includes('deals\\page.tsx') && 
               !f.includes('tasks\\page.tsx'));

const replacements = {
  'bg-white': 'bg-surf',
  'bg-slate-50': 'bg-surf2',
  'bg-slate-100': 'bg-surf2',
  'bg-slate-800': 'bg-ink',
  'bg-slate-900': 'bg-ink',
  'text-slate-900': 'text-ink',
  'text-slate-800': 'text-ink',
  'text-slate-700': 'text-ink',
  'text-slate-600': 'text-mute',
  'text-slate-500': 'text-mute',
  'text-slate-400': 'text-mute',
  'border-slate-200': 'border-line',
  'border-slate-300': 'border-line',
  'border-slate-100': 'border-line',
  'text-brand-600': 'text-acc',
  'text-brand-700': 'text-acc',
  'bg-brand-600': 'bg-acc',
  'bg-brand-500': 'bg-acc',
  'bg-brand-50': 'bg-acc/10',
  'shadow-sm': 'shadow-none',
  'shadow-md': 'shadow-none'
};

for (const file of targetFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  for (const [oldClass, newClass] of Object.entries(replacements)) {
    // Basic regex replacement for tailwind classes to ensure we only replace full words
    const regex = new RegExp(`(?<=\\s|["'\`])${oldClass}(?=\\s|["'\`])`, 'g');
    content = content.replace(regex, newClass);
  }

  // Also replace some common component imports if they are tightly coupled to the old theme
  // e.g. Card -> div className="panel"
  content = content.replace(/<Card className="([^"]+)">/g, '<div className="panel $1">');
  content = content.replace(/<Card>/g, '<div className="panel">');
  content = content.replace(/<\/Card>/g, '</div>');
  content = content.replace(/<CardHeader([^>]*)>/g, '<div className="mb-4"$1>');
  content = content.replace(/<\/CardHeader>/g, '</div>');
  content = content.replace(/<CardTitle([^>]*)>/g, '<h2 className="panel-title"$1>');
  content = content.replace(/<\/CardTitle>/g, '</h2>');
  content = content.replace(/<CardContent([^>]*)>/g, '<div$1>');
  content = content.replace(/<\/CardContent>/g, '</div>');
  content = content.replace(/<CardDescription([^>]*)>/g, '<p className="text-mute text-sm mt-1"$1>');
  content = content.replace(/<\/CardDescription>/g, '</p>');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated classes in ${file}`);
  }
}
