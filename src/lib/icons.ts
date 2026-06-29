// Mapping noms d'icônes Lucide → emojis
const ICON_MAP: Record<string, string> = {
  FileText: "📄", Target: "🎯", Bot: "🤖", ListOrdered: "📋",
  AlertTriangle: "⚠️", FolderOpen: "📁", Book: "📖", BookOpen: "📖",
  Pencil: "✏️", Edit: "✏️", Settings: "⚙️", Users: "👥",
  Clock: "🕐", Check: "✅", Star: "⭐", Lightbulb: "💡",
  Zap: "⚡", Search: "🔍", Eye: "👁️", MessageSquare: "💬",
  Link: "🔗", Image: "🖼️", File: "📄", Folder: "📁",
  Info: "ℹ️", HelpCircle: "❓", Award: "🏆", Layers: "📚",
  Layout: "📐", Grid: "📊", Clipboard: "📋", Download: "📥",
  Upload: "📤", Globe: "🌐", Code: "💻", Terminal: "💻",
  Shield: "🛡️", Lock: "🔒", Key: "🔑", Mail: "📧",
  Calendar: "📅", Briefcase: "💼", Tool: "🔧", Wrench: "🔧",
};

export function resolveIcon(icon: string, override?: string): string {
  const src = override || icon;
  if (src && src.charCodeAt(0) > 127) return src;
  if (ICON_MAP[src]) return ICON_MAP[src];
  if (src.length <= 2) return src;
  return src.charAt(0).toUpperCase();
}
