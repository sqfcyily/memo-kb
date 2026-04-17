import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// 使用 process.cwd() 确保路径动态绑定到项目根目录
const BASE_DIR = process.cwd();
const INBOX_DIR = path.join(BASE_DIR, 'inbox');
const LIBRARY_DIR = path.join(BASE_DIR, 'library');

export interface NoteData {
  content: string;
  data: Record<string, any>;
}

/**
 * 核心方法：确保目标目录在文件系统上真实存在
 * 采用递归创建 (recursive: true) 避免多级目录报错
 * @param dirPath 绝对路径
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * 通用读取逻辑：读取文件并解析 YAML Frontmatter
 * 如果文件不存在，返回 null，而不抛出异常
 */
async function readNote(dir: string, filename: string): Promise<NoteData | null> {
  await ensureDir(dir);
  const filePath = path.join(dir, filename);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(fileContent);
    return { data: parsed.data, content: parsed.content };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * 通用写入逻辑：将内容与 Frontmatter 对象序列化为字符串并持久化
 */
async function writeNote(dir: string, filename: string, note: NoteData): Promise<void> {
  await ensureDir(dir);
  const filePath = path.join(dir, filename);
  // gray-matter 的 stringify 会自动拼接 frontmatter 和正文
  const fileContent = matter.stringify(note.content, note.data);
  await fs.writeFile(filePath, fileContent, 'utf-8');
}

/**
 * 通用列表逻辑：获取指定目录下所有的 Markdown 文件名
 */
async function listNotes(dir: string): Promise<string[]> {
  await ensureDir(dir);
  const files = await fs.readdir(dir);
  return files.filter(file => file.endsWith('.md') || file.endsWith('.mdx'));
}

// ==========================================
// Inbox 目录 API
// ==========================================

export async function readInboxNote(filename: string): Promise<NoteData | null> {
  return readNote(INBOX_DIR, filename);
}

export async function writeInboxNote(filename: string, note: NoteData): Promise<void> {
  return writeNote(INBOX_DIR, filename, note);
}

export async function listInboxNotes(): Promise<string[]> {
  return listNotes(INBOX_DIR);
}

// ==========================================
// Library 目录 API
// ==========================================

export async function readLibraryNote(filename: string): Promise<NoteData | null> {
  return readNote(LIBRARY_DIR, filename);
}

export async function writeLibraryNote(filename: string, note: NoteData): Promise<void> {
  return writeNote(LIBRARY_DIR, filename, note);
}

export async function listLibraryNotes(): Promise<string[]> {
  return listNotes(LIBRARY_DIR);
}
