/**
 * Pure TypeScript ZIP & EPUB Generator (Zero External Dependencies)
 * Generates standards-compliant EPUB files compatible with Apple Books, Kindle, WeChat Read, etc.
 */

// CRC-32 Lookup Table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipFile {
  name: string;
  data: Uint8Array;
}

export function createZip(files: ZipFile[]): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const fileCrc = crc32(file.data);
    const size = file.data.length;

    // Local Header (30 bytes + name)
    const local = new Uint8Array(30 + nameBytes.length);
    const viewL = new DataView(local.buffer);
    viewL.setUint32(0, 0x04034b50, true); // signature
    viewL.setUint16(4, 20, true); // version needed (2.0)
    viewL.setUint16(6, 0x0800, true); // flags (UTF-8)
    viewL.setUint16(8, 0, true); // compression (0 = stored)
    viewL.setUint16(10, 0, true); // time
    viewL.setUint16(12, 0, true); // date
    viewL.setUint32(14, fileCrc, true);
    viewL.setUint32(18, size, true); // compressed size
    viewL.setUint32(22, size, true); // uncompressed size
    viewL.setUint16(26, nameBytes.length, true);
    viewL.setUint16(28, 0, true); // extra length
    local.set(nameBytes, 30);

    localHeaders.push(local);
    localHeaders.push(file.data);

    // Central Directory Header (46 bytes + name)
    const central = new Uint8Array(46 + nameBytes.length);
    const viewC = new DataView(central.buffer);
    viewC.setUint32(0, 0x02014b50, true); // signature
    viewC.setUint16(4, 20, true); // version made by
    viewC.setUint16(6, 20, true); // version needed
    viewC.setUint16(8, 0x0800, true); // flags (UTF-8)
    viewC.setUint16(10, 0, true); // compression (stored)
    viewC.setUint16(12, 0, true); // time
    viewC.setUint16(14, 0, true); // date
    viewC.setUint32(16, fileCrc, true);
    viewC.setUint32(20, size, true);
    viewC.setUint32(24, size, true);
    viewC.setUint16(28, nameBytes.length, true);
    viewC.setUint16(30, 0, true); // extra len
    viewC.setUint16(32, 0, true); // comment len
    viewC.setUint16(34, 0, true); // disk start
    viewC.setUint16(36, 0, true); // internal attr
    viewC.setUint32(38, 0, true); // external attr
    viewC.setUint32(42, offset, true); // relative offset of local header
    central.set(nameBytes, 46);

    centralHeaders.push(central);
    offset += local.length + size;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const c of centralHeaders) centralDirSize += c.length;

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const viewE = new DataView(eocd.buffer);
  viewE.setUint32(0, 0x06054b50, true); // signature
  viewE.setUint16(4, 0, true); // disk num
  viewE.setUint16(6, 0, true); // central dir disk
  viewE.setUint16(8, files.length, true); // entries this disk
  viewE.setUint16(10, files.length, true); // total entries
  viewE.setUint32(12, centralDirSize, true); // central dir size
  viewE.setUint32(16, centralDirOffset, true); // central dir offset
  viewE.setUint16(20, 0, true); // comment length

  // Assemble the total archive
  const totalLength = centralDirOffset + centralDirSize + eocd.length;
  const out = new Uint8Array(totalLength);
  let pos = 0;

  for (const chunk of localHeaders) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  for (const chunk of centralHeaders) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  out.set(eocd, pos);

  return out;
}

export interface EpubChapter {
  title: string;
  order: number;
  htmlContent: string;
}

export interface EpubOptions {
  title: string;
  author: string;
  summary: string;
  identifier?: string;
  chapters: EpubChapter[];
}

/**
 * Generate standard EPUB 3 / EPUB 2 binary array
 */
export function generateEpub(options: EpubOptions): Uint8Array {
  const encoder = new TextEncoder();
  const id = options.identifier || `urn:swim-lib:${encodeURIComponent(options.title)}`;
  const dateStr = new Date().toISOString().split("T")[0];

  const files: ZipFile[] = [];

  // 1. mimetype (MUST be first, uncompressed)
  files.push({
    name: "mimetype",
    data: encoder.encode("application/epub+zip"),
  });

  // 2. META-INF/container.xml
  files.push({
    name: "META-INF/container.xml",
    data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`),
  });

  // 3. OEBPS/style.css
  files.push({
    name: "OEBPS/style.css",
    data: encoder.encode(`
body {
  font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif;
  line-height: 1.8;
  margin: 5% 8%;
  color: #1a1a1a;
  text-align: justify;
}
h1 {
  font-size: 1.6em;
  font-weight: bold;
  text-align: center;
  margin: 1.5em 0 1.2em;
  line-height: 1.3;
}
h2 {
  font-size: 1.3em;
  margin: 1.4em 0 0.8em;
}
h3 {
  font-size: 1.1em;
  margin: 1.2em 0 0.6em;
}
p {
  margin: 0 0 1.2em;
  text-indent: 2em;
}
blockquote {
  margin: 1.2em 1.5em;
  padding: 0.6em 1.2em;
  border-left: 3px solid #7fa9f5;
  color: #4a5568;
}
.book-title {
  font-size: 2.2em;
  text-align: center;
  margin-top: 30%;
}
.book-author {
  font-size: 1.2em;
  text-align: center;
  color: #555;
  margin-top: 1em;
}
.book-summary {
  margin-top: 3em;
  font-size: 0.95em;
  color: #666;
  line-height: 1.7;
}
`),
  });

  // 4. Chapter XHTML files
  const manifestItems: string[] = [
    `<item id="style" href="style.css" media-type="text/css"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
  ];
  const spineItems: string[] = [
    `<itemref idref="cover"/>`,
  ];
  const ncxNavPoints: string[] = [];

  // Cover / Title Page
  files.push({
    name: "OEBPS/cover.xhtml",
    data: encoder.encode(`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(options.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="book-title">${escapeXml(options.title)}</div>
  <div class="book-author">${escapeXml(options.author)}</div>
  <div class="book-summary">${escapeXml(options.summary)}</div>
</body>
</html>`),
  });

  options.chapters.forEach((chapter, index) => {
    const filename = `chapter_${String(index + 1).padStart(2, "0")}.xhtml`;
    const itemId = `chap_${index + 1}`;

    manifestItems.push(`<item id="${itemId}" href="${filename}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${itemId}"/>`);
    ncxNavPoints.push(`
    <navPoint id="np_${index + 1}" playOrder="${index + 2}">
      <navLabel><text>${escapeXml(chapter.title)}</text></navLabel>
      <content src="${filename}"/>
    </navPoint>`);

    // Wrap raw markdown or html inside valid XML
    const cleanBody = wrapInXhtmlParagraphs(chapter.htmlContent);

    files.push({
      name: `OEBPS/${filename}`,
      data: encoder.encode(`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${escapeXml(chapter.title)}</h1>
  ${cleanBody}
</body>
</html>`),
    });
  });

  // 5. OEBPS/nav.xhtml (EPUB 3 Nav)
  files.push({
    name: "OEBPS/nav.xhtml",
    data: encoder.encode(`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <title>目录</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>
      ${options.chapters
        .map(
          (c, idx) =>
            `<li><a href="chapter_${String(idx + 1).padStart(2, "0")}.xhtml">${escapeXml(c.title)}</a></li>`,
        )
        .join("\n      ")}
    </ol>
  </nav>
</body>
</html>`),
  });

  // 6. OEBPS/toc.ncx (EPUB 2 NCX)
  files.push({
    name: "OEBPS/toc.ncx",
    data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(options.title)}</text></docTitle>
  <docAuthor><text>${escapeXml(options.author)}</text></docAuthor>
  <navMap>
    <navPoint id="np_cover" playOrder="1">
      <navLabel><text>扉页</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>
    ${ncxNavPoints.join("\n")}
  </navMap>
</ncx>`),
  });

  // 7. OEBPS/content.opf
  files.push({
    name: "OEBPS/content.opf",
    data: encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(options.title)}</dc:title>
    <dc:creator>${escapeXml(options.author)}</dc:creator>
    <dc:language>zh-CN</dc:language>
    <dc:identifier id="BookID">${id}</dc:identifier>
    <dc:description>${escapeXml(options.summary)}</dc:description>
    <dc:date>${dateStr}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join("\n    ")}
  </spine>
</package>`),
  });

  return createZip(files);
}

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapInXhtmlParagraphs(content: string): string {
  if (content.includes("<p>") || content.includes("<h")) {
    // If it's already HTML, ensure XML self-closing tags
    return content
      .replace(/<hr>/g, "<hr/>")
      .replace(/<br>/g, "<br/>")
      .replace(/<img([^>]*?)(?<!\/)>/g, "<img$1/>");
  }

  return content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("# ")) return `<h1>${escapeXml(block.slice(2))}</h1>`;
      if (block.startsWith("## ")) return `<h2>${escapeXml(block.slice(3))}</h2>`;
      if (block.startsWith("### ")) return `<h3>${escapeXml(block.slice(4))}</h3>`;
      if (block.startsWith("> ")) return `<blockquote><p>${escapeXml(block.slice(2))}</p></blockquote>`;
      return `<p>${escapeXml(block)}</p>`;
    })
    .join("\n  ");
}
