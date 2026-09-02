import JSZip from "jszip";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function joinTTexts(xmlFragment: string): string {
  const parts: string[] = [];
  const re = /<t[^>]*>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xmlFragment)) !== null) {
    parts.push(m[1]!);
  }
  return parts.join("");
}

function hasPlaceholder(text: string): boolean {
  return /\{\{.+?\}\}/.test(text);
}

function replacePlaceholders(
  text: string,
  variableMap: Record<string, string>,
): string {
  return text.replace(/\{\{(.+?)\}\}/g, (match, key: string) => {
    const trimmed = key.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("/")) return "";
    return trimmed in variableMap ? variableMap[trimmed]! : match;
  });
}

function shiftRangeRef(range: string, rowOffset: number): string {
  return range.replace(/([A-Z]+)(\d+)/g, (_m, col: string, row: string) => {
    return `${col}${Number(row) + rowOffset}`;
  });
}

/* ── 循环数据类型 ── */

export interface LoopData {
  name: string;
  items: Record<string, string>[];
}

/* ── 主入口 ── */

export async function fillExcelVariables(
  buffer: Uint8Array,
  variableMap: Record<string, string>,
  loops?: LoopData[],
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(buffer);

  const ssPath = Object.keys(zip.files).find(
    (f) => f.toLowerCase() === "xl/sharedstrings.xml",
  );

  // ── 0. 构建 sharedString index → text 映射 ──
  const ssTexts: string[] = [];
  let ssXml = "";
  if (ssPath) {
    ssXml = await zip.file(ssPath)!.async("string");
    const siRe = /<si>([\s\S]*?)<\/si>/g;
    let sm: RegExpExecArray | null;
    while ((sm = siRe.exec(ssXml)) !== null) {
      ssTexts.push(joinTTexts(sm[1]!));
    }
  }

  // ── 1. 循环行展开（在变量替换前执行） ──
  if (loops?.length && ssTexts.length > 0) {
    const sheetFiles = Object.keys(zip.files).filter(
      (f) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(f),
    );

    for (const loop of loops) {
      if (loop.items.length === 0) continue;

      // 找到 {{#each NAME}} 和 {{/each}} 的 shared string index
      const eachTag = `{{#each ${loop.name}}}`;
      const endTag = "{{/each}}";
      const startIdx = ssTexts.findIndex((t) => t.trim() === eachTag);
      const endIdx = ssTexts.findIndex((t) => t.trim() === endTag);
      if (startIdx < 0 || endIdx < 0) continue;

      for (const sheetPath of sheetFiles) {
        const sf = zip.file(sheetPath);
        if (!sf) continue;
        let sheetXml = await sf.async("string");

        // 找到包含标记的行号
        const startRowNum = findRowWithSsIndex(sheetXml, startIdx);
        const endRowNum = findRowWithSsIndex(sheetXml, endIdx);
        if (startRowNum < 0 || endRowNum < 0 || endRowNum <= startRowNum) continue;

        // 提取模版行（标记行之间的行）
        const templateRowNums: number[] = [];
        for (let r = startRowNum + 1; r < endRowNum; r++) templateRowNums.push(r);
        if (templateRowNums.length === 0) continue;

        const templateRowXmls: string[] = templateRowNums.map((rn) => extractRow(sheetXml, rn)).filter(Boolean);
        if (templateRowXmls.length === 0) continue;

        // 收集模版行中引用了占位变量的 shared string indices
        const varSsIndices = new Map<number, string>();
        for (const idx of findSsIndicesInRows(templateRowXmls)) {
          const text = ssTexts[idx];
          if (text && hasPlaceholder(text)) {
            const varName = text.replace(/\{\{(.+?)\}\}/, "$1").trim();
            varSsIndices.set(idx, varName);
          }
        }

        // 为每个 item 生成克隆行（展开行从 startRowNum 开始，覆盖被删标记行位置）
        const templateRowCount = templateRowNums.length;
        const rowOffset = (loop.items.length - 1) * templateRowCount - 2;

        const allExpandedRows: string[] = [];
        for (let itemIdx = 0; itemIdx < loop.items.length; itemIdx++) {
          const itemVars = loop.items[itemIdx]!;
          const baseRowOffset = itemIdx * templateRowCount;

          for (let ti = 0; ti < templateRowXmls.length; ti++) {
            let rowXml = templateRowXmls[ti]!;
            const newRowNum = startRowNum + baseRowOffset + ti;

            // 更新行号
            rowXml = rowXml.replace(
              /(<row\b[^>]*\br=")(\d+)(")/,
              `$1${newRowNum}$3`,
            );

            // 更新单元格引用 + 替换变量值为内联字符串
            rowXml = rowXml.replace(
              /(<c\b)([^>/]*)(>[\s\S]*?<\/c>|\/>)/g,
              (_cellMatch, cTag: string, attrs: string, rest: string) => {
                // 更新 r="X12" → r="X{newRowNum}"
                attrs = attrs.replace(/r="([A-Z]+)\d+"/, (_rm, col: string) => `r="${col}${newRowNum}"`);

                if (itemIdx === 0) return cTag + attrs + rest;

                // 对于第 2+ 项，将变量单元格转为内联字符串
                const vMatch = rest.match(/<v>(\d+)<\/v>/);
                const tMatch = attrs.match(/t="s"/);
                if (vMatch && tMatch) {
                  const ssIdx = Number(vMatch[1]);
                  const varName = varSsIndices.get(ssIdx);
                  if (varName && varName in itemVars) {
                    const val = escapeXml(itemVars[varName]!);
                    const newAttrs = attrs.replace(/t="s"/, 't="inlineStr"');
                    return `${cTag}${newAttrs}><is><t xml:space="preserve">${val}</t></is></c>`;
                  }
                }
                return cTag + attrs + rest;
              },
            );

            allExpandedRows.push(rowXml);
          }
        }

        // 提取模版行的合并单元格（在删除行之前）
        const templateMerges = extractMergeCellsForRows(sheetXml, templateRowNums);

        // 删除标记行（start/end）和原模版行
        const rowsToRemove = [startRowNum, ...templateRowNums, endRowNum];
        for (const rn of rowsToRemove) {
          sheetXml = removeRow(sheetXml, rn);
        }

        // 移除已删除行的合并单元格
        if (templateMerges.length > 0) {
          sheetXml = removeMergeCellsForRows(sheetXml, rowsToRemove);
        }

        // 先偏移后续行号（在插入展开行之前，避免展开行被误偏移）
        if (rowOffset !== 0) {
          const shiftAfter = endRowNum;
          sheetXml = shiftRowsAfter(sheetXml, shiftAfter, rowOffset);
          sheetXml = shiftMergeCellsAfter(sheetXml, shiftAfter, rowOffset);
        }

        // 插入展开行
        const insertPoint = findInsertPoint(sheetXml, startRowNum - 1);
        sheetXml = sheetXml.slice(0, insertPoint) + allExpandedRows.join("") + sheetXml.slice(insertPoint);

        // 为展开行添加合并单元格
        if (templateMerges.length > 0) {
          const newMerges: string[] = [];
          for (let itemIdx = 0; itemIdx < loop.items.length; itemIdx++) {
            const baseOffset = (startRowNum + itemIdx * templateRowCount) - templateRowNums[0]!;
            for (const merge of templateMerges) {
              newMerges.push(shiftRangeRef(merge, baseOffset));
            }
          }
          sheetXml = addMergeCells(sheetXml, newMerges);
        }

        zip.file(sheetPath, sheetXml);

        // 扩展 workbook.xml 中的打印区域，使新增行纳入打印范围
        if (rowOffset !== 0) {
          await expandPrintArea(zip, sheetPath, rowOffset);
        }
      }
    }
  }

  // ── 2. 变量替换（sharedStrings） ──
  if (ssPath && Object.keys(variableMap).length > 0) {
    ssXml = await zip.file(ssPath)!.async("string");

    ssXml = ssXml.replace(/<si>([\s\S]*?)<\/si>/g, (siMatch, siBody: string) => {
      const joined = joinTTexts(siBody);
      if (!hasPlaceholder(joined)) return siMatch;
      const replaced = replacePlaceholders(joined, variableMap);
      return `<si><t xml:space="preserve">${escapeXml(replaced)}</t></si>`;
    });

    zip.file(ssPath, ssXml);
  }

  // ── 3. sheet XML 内联/直接字符串替换 ──
  if (Object.keys(variableMap).length > 0) {
    const sheetFiles = Object.keys(zip.files).filter(
      (f) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(f),
    );

    for (const sheetPath of sheetFiles) {
      const sf = zip.file(sheetPath);
      if (!sf) continue;
      let sheetXml = await sf.async("string");
      let changed = false;

      sheetXml = sheetXml.replace(/<is>([\s\S]*?)<\/is>/g, (isMatch, isBody: string) => {
        const joined = joinTTexts(isBody);
        if (!hasPlaceholder(joined)) return isMatch;
        changed = true;
        const replaced = replacePlaceholders(joined, variableMap);
        return `<is><t xml:space="preserve">${escapeXml(replaced)}</t></is>`;
      });

      sheetXml = sheetXml.replace(
        /(<c\b[^>]*\bt="str"[^>]*>)([\s\S]*?)(<\/c>)/g,
        (cMatch, cOpen: string, cBody: string, cClose: string) => {
          const vMatch = cBody.match(/<v>([\s\S]*?)<\/v>/);
          if (!vMatch) return cMatch;
          const vText = vMatch[1]!;
          if (!hasPlaceholder(vText)) return cMatch;
          changed = true;
          const replaced = replacePlaceholders(vText, variableMap);
          const newBody = cBody.replace(/<v>[\s\S]*?<\/v>/, `<v>${escapeXml(replaced)}</v>`);
          return cOpen + newBody + cClose;
        },
      );

      if (changed) {
        zip.file(sheetPath, sheetXml);
      }
    }
  }

  await removeCalcChain(zip);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

/* ── XML 行操作辅助函数 ── */

function findRowWithSsIndex(sheetXml: string, ssIndex: number): number {
  const rowRe = /<row\b[^>]*r="(\d+)"[^>]*>[\s\S]*?<\/row>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(sheetXml)) !== null) {
    if (m[0].includes(`t="s"`) && m[0].includes(`<v>${ssIndex}</v>`)) {
      return Number(m[1]);
    }
  }
  return -1;
}

function extractRow(sheetXml: string, rowNum: number): string {
  const re = new RegExp(`<row\\b[^>]*r="${rowNum}"[^>]*>[\\s\\S]*?</row>`);
  const m = re.exec(sheetXml);
  return m ? m[0] : "";
}

function removeRow(sheetXml: string, rowNum: number): string {
  const re = new RegExp(`<row\\b[^>]*r="${rowNum}"[^>]*>[\\s\\S]*?</row>`);
  return sheetXml.replace(re, "");
}

function findInsertPoint(sheetXml: string, afterRowNum: number): number {
  const re = /<row\b[^>]*r="(\d+)"[^>]*>[\s\S]*?<\/row>/g;
  let lastEnd = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sheetXml)) !== null) {
    const rn = Number(m[1]);
    if (rn > afterRowNum && lastEnd < 0) return m.index;
    lastEnd = m.index + m[0].length;
  }
  return lastEnd >= 0 ? lastEnd : sheetXml.indexOf("</sheetData>");
}

function findSsIndicesInRows(rowXmls: string[]): number[] {
  const indices: number[] = [];
  for (const row of rowXmls) {
    const re = /<c\b[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(row)) !== null) {
      indices.push(Number(m[1]));
    }
  }
  return indices;
}

function shiftRowsAfter(sheetXml: string, afterRow: number, offset: number): string {
  return sheetXml.replace(
    /(<row\b[^>]*r=")(\d+)("[^>]*>)([\s\S]*?)(<\/row>)/g,
    (match, pre: string, rowStr: string, mid: string, body: string, end: string) => {
      const rn = Number(rowStr);
      if (rn <= afterRow) return match;
      const newRn = rn + offset;
      const newBody = body.replace(/(<c\b[^>]*r=")([A-Z]+)(\d+)(")/g,
        (_cm, cpre: string, col: string, _cr: string, cpost: string) => `${cpre}${col}${newRn}${cpost}`,
      );
      return `${pre}${newRn}${mid}${newBody}${end}`;
    },
  );
}

function shiftMergeCellsAfter(sheetXml: string, afterRow: number, offset: number): string {
  return sheetXml.replace(/<mergeCell ref="([^"]+)"\/>/g, (match, ref: string) => {
    const parts = ref.split(":");
    const rows = parts.map((p) => Number(p.replace(/[A-Z]+/, "")));
    if (rows.every((r) => r <= afterRow)) return match;
    const newRef = parts
      .map((p) => {
        const col = p.replace(/\d+/, "");
        const row = Number(p.replace(/[A-Z]+/, ""));
        return row > afterRow ? `${col}${row + offset}` : p;
      })
      .join(":");
    return `<mergeCell ref="${newRef}"/>`;
  });
}

function extractMergeCellsForRows(sheetXml: string, rowNums: number[]): string[] {
  const rowSet = new Set(rowNums);
  const merges: string[] = [];
  const re = /<mergeCell ref="([^"]+)"\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sheetXml)) !== null) {
    const ref = m[1]!;
    const parts = ref.split(":");
    const rows = parts.map((p) => Number(p.replace(/[A-Z]+/, "")));
    if (rows.some((r) => rowSet.has(r))) {
      merges.push(ref);
    }
  }
  return merges;
}

function removeMergeCellsForRows(sheetXml: string, rowNums: number[]): string {
  const rowSet = new Set(rowNums);
  const updatedXml = sheetXml.replace(/<mergeCell ref="([^"]+)"\/>/g, (match, ref: string) => {
    const parts = ref.split(":");
    const rows = parts.map((p) => Number(p.replace(/[A-Z]+/, "")));
    if (rows.some((r) => rowSet.has(r))) return "";
    return match;
  });
  return normalizeMergeCellsCount(updatedXml);
}

function addMergeCells(sheetXml: string, newRefs: string[]): string {
  if (newRefs.length === 0) return sheetXml;
  const newTags = newRefs.map((r) => `<mergeCell ref="${r}"/>`).join("");

  if (/<mergeCells\b/.test(sheetXml)) {
    return normalizeMergeCellsCount(sheetXml.replace("</mergeCells>", `${newTags}</mergeCells>`));
  }

  return sheetXml.replace("</sheetData>", `</sheetData><mergeCells count="${newRefs.length}">${newTags}</mergeCells>`);
}

function normalizeMergeCellsCount(sheetXml: string): string {
  return sheetXml.replace(/<mergeCells\b([^>]*)>([\s\S]*?)<\/mergeCells>/g, (match, attrs: string, body: string) => {
    const count = (body.match(/<mergeCell\b/g) ?? []).length;
    if (count === 0) return "";
    const normalizedAttrs = /\bcount="/.test(attrs)
      ? attrs.replace(/\bcount="[^"]*"/, `count="${count}"`)
      : `${attrs} count="${count}"`;
    const next = `<mergeCells${normalizedAttrs}>${body}</mergeCells>`;
    return next === match ? match : next;
  });
}

async function removeCalcChain(zip: JSZip): Promise<void> {
  if (zip.file("xl/calcChain.xml")) {
    zip.remove("xl/calcChain.xml");
  }

  const relsFile = zip.file("xl/_rels/workbook.xml.rels");
  if (relsFile) {
    const relsXml = await relsFile.async("string");
    const nextRelsXml = relsXml.replace(
      /<Relationship[^>]+Type="[^"]*\/calcChain"[^>]*\/>\s*/g,
      "",
    );
    if (nextRelsXml !== relsXml) {
      zip.file("xl/_rels/workbook.xml.rels", nextRelsXml);
    }
  }

  const ctFile = zip.file("[Content_Types].xml");
  if (ctFile) {
    const ctXml = await ctFile.async("string");
    const nextCtXml = ctXml.replace(
      /<Override[^>]+PartName="\/xl\/calcChain\.xml"[^>]*\/>\s*/g,
      "",
    );
    if (nextCtXml !== ctXml) {
      zip.file("[Content_Types].xml", nextCtXml);
    }
  }
}

/**
 * 循环展开新增行后，自动扩展 workbook.xml 中对应 sheet 的打印区域，
 * 使新增行纳入打印范围，Excel 打印/预览时自动分页。
 */
async function expandPrintArea(zip: JSZip, sheetPath: string, rowOffset: number): Promise<void> {
  const wbFile = zip.file("xl/workbook.xml");
  const relsFile = zip.file("xl/_rels/workbook.xml.rels");
  if (!wbFile || !relsFile) return;

  const [wbXml, relsXml] = await Promise.all([wbFile.async("string"), relsFile.async("string")]);

  const pathInRels = sheetPath.replace("xl/", "");
  const relMatch = relsXml.match(new RegExp(`<Relationship[^>]+Target="${pathInRels}"[^>]+Id="([^"]+)"`))
    ?? relsXml.match(new RegExp(`<Relationship[^>]+Id="([^"]+)"[^>]+Target="${pathInRels}"`));
  const rId = relMatch?.[1];
  if (!rId) return;

  const sheets: { rId: string; idx: number }[] = [];
  const sheetRe = /<sheet\s[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = sheetRe.exec(wbXml)) !== null) {
    const rIdMatch = /r:id="([^"]+)"/.exec(m[0]);
    if (rIdMatch) sheets.push({ rId: rIdMatch[1]!, idx });
    idx++;
  }
  const targetSheet = sheets.find((s) => s.rId === rId);
  if (!targetSheet) return;

  const localId = targetSheet.idx;
  const newWbXml = wbXml.replace(
    new RegExp(`(<definedName[^>]+name="_xlnm\\.Print_Area"[^>]+localSheetId="${localId}"[^>]*>)([^<]*)(</definedName>)`),
    (_dm, pre: string, value: string, post: string) => {
      const newValue = value.replace(
        /(\$[A-Z]+\$)(\d+)$/,
        (_rm, col: string, row: string) => `${col}${Number(row) + rowOffset}`,
      );
      return pre + newValue + post;
    },
  );

  if (newWbXml !== wbXml) {
    zip.file("xl/workbook.xml", newWbXml);
  }
}
