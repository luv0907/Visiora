const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const hooks = ['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback'];
  const missing = [];
  
  hooks.forEach(hook => {
    // Check if hook is used
    if (new RegExp(`\\b${hook}\\b`).test(content)) {
      // Check if hook is imported
      const reactImportRegex = /import\s+[^'"]*from\s+['"]react['"]/g;
      const reactImports = content.match(reactImportRegex) || [];
      const isImported = reactImports.some(imp => new RegExp(`\\b${hook}\\b`).test(imp));
      
      if (!isImported) {
        missing.push(hook);
      }
    }
  });

  if (missing.length > 0) {
    console.log(`Missing imports in ${filePath}: ${missing.join(', ')}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      checkFile(fullPath);
    }
  });
}

walkDir('./src');
