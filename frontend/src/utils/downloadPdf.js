import jsPDF from 'jspdf'

function hexToRgb(hex) {
  if (!hex) return [79, 70, 229]; // indigo-600 default
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [79, 70, 229];
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/\n|•|;/g)
      .map((item) => item.replace(/^\d+[.)\-\s]*/, "").trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function formatKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isSimpleValue(value) {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

export async function downloadReportAsPdf({ result, competitorDetails, theme }, fileName = 'competeintel-report.pdf') {
  if (!result) {
    throw new Error('Report data not found.')
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  let y = 15;
  const margin = 15;
  const contentWidth = 180;
  const pageHeight = 297;
  const pageLimit = 265; // Leave extra space for footer
  const primaryRgb = hexToRgb(theme?.primaryDark || "#4f46e5");

  // Helper to ensure page space
  function checkSpace(neededHeight, titleForNextPage = "") {
    if (y + neededHeight > pageLimit) {
      doc.addPage();
      y = 22; // Start below running header
      
      // Draw running header
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("CompeteIntel Market Intelligence Report", margin, 12);
      if (titleForNextPage) {
        doc.text(titleForNextPage, 210 - margin, 12, { align: 'right' });
      }
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.2);
      doc.line(margin, 14, 210 - margin, 14);
      return true;
    }
    return false;
  }

  // Draw generic Section Header
  function drawSectionHeader(title) {
    checkSpace(18, title);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.text(title, margin, y);
    
    doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 2, margin + 25, y + 2);
    
    y += 8;
  }

  // Draw side-by-side or full-width Text Panels
  function drawTextPanel(title, lines, x, width, height) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, y, width, height, 3, 3, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(title, x + 4, y + 6);
    
    // Tiny header line
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(x + 4, y + 8, x + width - 4, y + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    
    lines.forEach((line, index) => {
      if (y + 13 + index * 4 <= y + height - 4) {
        doc.text(line, x + 4, y + 13 + index * 4);
      }
    });
  }

  // Draw side-by-side or full-width Bullet Lists
  function drawListBlock(title, items, x, width, height) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, width, height, 3, 3, 'FD');
    
    // Draw title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x + 4, y + 6);
    
    // Header line
    doc.setDrawColor(241, 245, 249);
    doc.line(x + 4, y + 8, x + width - 4, y + 8);
    
    // Draw list items
    const list = toArray(items);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    
    let itemY = y + 13;
    if (list.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.text("No items available.", x + 4, itemY);
    } else {
      list.slice(0, 8).forEach((item) => {
        // Bullet dot
        doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
        doc.circle(x + 5, itemY - 1, 0.6, 'F');
        
        // Wrap text
        const itemLines = doc.splitTextToSize(item, width - 11);
        itemLines.forEach((line) => {
          if (itemY <= y + height - 4) {
            doc.text(line, x + 8, itemY);
            itemY += 4;
          }
        });
      });
    }
  }

  // ----------------------------------------------------
  // PAGE 1: COVER HEADER & OVERVIEW
  // ----------------------------------------------------

  // Accent Top Line
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(margin, 15, contentWidth, 4, 'F');
  
  // Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text("COMPETEINTEL", margin, 27);
  
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(23);
  doc.setTextColor(30, 41, 59);
  doc.text("Intelligence & Market Analysis Report", margin, 39);
  
  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  const pName = result?.product_name || "Target Product";
  const pRegion = result?.competitor_region || "Global";
  doc.text(`Target Product: ${pName}  |  Market Region: ${pRegion}`, margin, 46);
  
  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, 52, 210 - margin, 52);
  
  y = 59;

  // Metadata metrics
  const analysis = result?.analysis || {};
  const discovery = result?.competitor_discovery || {};
  const insights = result?.market_insights || {};
  
  const competitors =
    discovery?.discovered_competitors ||
    discovery?.result?.discovered_competitors ||
    discovery?.competitors ||
    discovery?.result?.competitors ||
    [];

  const metrics = [
    { label: "TARGET PRODUCT", value: result?.product_name || "—" },
    { label: "TARGET REGION", value: result?.competitor_region || "—" },
    { label: "COMPETITORS FOUND", value: String(competitors.length) },
    { label: "MARKET CATEGORY", value: analysis?.category || insights?.competitive_positioning || "—" }
  ];

  const colW = (contentWidth - 6) / 2; // 87
  const cardW = (contentWidth - 9) / 4; // 42.75
  const cardGap = 3;
  const cardH = 18;

  metrics.forEach((m, idx) => {
    const cardX = margin + idx * (cardW + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(cardX, y, cardW, cardH, 2.5, 2.5, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(m.label, cardX + 3.5, y + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const valLines = doc.splitTextToSize(m.value, cardW - 6);
    doc.text(valLines[0] || "", cardX + 3.5, y + 10.5);
    if (valLines[1]) {
      doc.setFontSize(7);
      doc.text(valLines[1], cardX + 3.5, y + 14);
    }
  });

  y += cardH + 9;

  // Executive summary
  drawSectionHeader("Executive Summary");
  const execSummary = insights?.executive_summary || "No market summary available.";
  const summaryLines = doc.splitTextToSize(execSummary, contentWidth - 8);
  const summaryH = summaryLines.length * 4.8 + 9;
  
  checkSpace(summaryH, "Executive Summary");
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, summaryH, 3, 3, 'FD');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  summaryLines.forEach((line, index) => {
    doc.text(line, margin + 4, y + 6 + index * 4.8);
  });
  
  y += summaryH + 8;

  // Target customers and core features
  const leftX = margin;
  const rightX = margin + colW + 6;
  const listHeight = 52;

  checkSpace(listHeight + 5, "Product Foundation");
  drawListBlock("Target Customers", analysis?.target_users, leftX, colW, listHeight);
  drawListBlock("Core Features", analysis?.core_features, rightX, colW, listHeight);
  y += listHeight + 8;

  // ----------------------------------------------------
  // PAGE 2: SWOT & CORE ANALYSIS
  // ----------------------------------------------------
  doc.addPage();
  y = 22;
  
  // running header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("CompeteIntel Market Intelligence Report", margin, 12);
  doc.text("SWOT & Product Analysis", 210 - margin, 12, { align: 'right' });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, 14, 210 - margin, 14);

  // SWOT
  drawSectionHeader("SWOT Analysis");
  const strengths = toArray(insights?.strengths);
  const weaknesses = toArray(insights?.weaknesses);
  const opportunities = toArray(insights?.opportunities);
  const threats = toArray(insights?.threats);
  
  const swotBoxW = (contentWidth - 4) / 2; // 88
  const swotBoxH = 43;

  checkSpace(swotBoxH * 2 + 10, "SWOT Analysis");

  function drawSwotQuadrant(title, items, qX, qY, bgRgb, borderRgb, textRgb) {
    doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
    doc.setDrawColor(borderRgb[0], borderRgb[1], borderRgb[2]);
    doc.roundedRect(qX, qY, swotBoxW, swotBoxH, 3, 3, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    doc.text(title, qX + 5, qY + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    
    let itemY = qY + 12;
    if (items.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.text("No items specified.", qX + 5, itemY);
    } else {
      items.slice(0, 5).forEach((item) => {
        doc.setFillColor(textRgb[0], textRgb[1], textRgb[2]);
        doc.circle(qX + 6, itemY - 1, 0.5, 'F');
        
        const wrapped = doc.splitTextToSize(item, swotBoxW - 13);
        wrapped.forEach((line) => {
          if (itemY <= qY + swotBoxH - 4) {
            doc.text(line, qX + 9, itemY);
            itemY += 4;
          }
        });
      });
    }
  }

  // Row 1
  drawSwotQuadrant("STRENGTHS", strengths, margin, y, [240, 253, 250], [204, 251, 241], [15, 118, 110]);
  drawSwotQuadrant("WEAKNESSES", weaknesses, margin + swotBoxW + 4, y, [255, 241, 242], [254, 226, 226], [190, 24, 74]);
  y += swotBoxH + 4;

  // Row 2
  drawSwotQuadrant("OPPORTUNITIES", opportunities, margin, y, [240, 249, 255], [224, 242, 254], [3, 105, 161]);
  drawSwotQuadrant("THREATS", threats, margin + swotBoxW + 4, y, [254, 243, 199], [253, 230, 138], [180, 83, 9]);
  y += swotBoxH + 10;

  // Product Proposition & Edge
  drawSectionHeader("Strategic Foundations");
  
  const valProp = analysis?.value_proposition || "No value proposition statement available.";
  const compEdge = analysis?.competitive_edge || "No competitive edge statement available.";
  
  const valPropLines = doc.splitTextToSize(valProp, colW - 8);
  const compEdgeLines = doc.splitTextToSize(compEdge, colW - 8);
  const blockH = Math.max(valPropLines.length, compEdgeLines.length) * 4.5 + 13;

  checkSpace(blockH + 5, "Strategic Foundations");
  drawTextPanel("Value Proposition", valPropLines, leftX, colW, blockH);
  drawTextPanel("Competitive Edge", compEdgeLines, rightX, colW, blockH);
  y += blockH + 8;

  // Strategic Positioning & Market Gaps
  const stratPos = analysis?.strategic_positioning || "No strategic positioning available.";
  const stratLines = doc.splitTextToSize(stratPos, colW - 8);
  const marketGaps = toArray(analysis?.market_gaps);
  const gapsH = Math.max(stratLines.length * 4.5 + 13, Math.min(15 + marketGaps.length * 5.5, 45));

  checkSpace(gapsH + 5, "Strategic Foundations");
  drawTextPanel("Strategic Positioning Statement", stratLines, leftX, colW, gapsH);
  drawListBlock("Identified Market Gaps", marketGaps, rightX, colW, gapsH);
  y += gapsH + 8;

  // General observations & notes
  const pricingObs = toArray(analysis?.pricing_observations);
  const notesText = toArray(analysis?.notes).join(" ").trim() || "No additional observations noted.";
  const notesLines = doc.splitTextToSize(notesText, colW - 8);
  const pricingH = Math.max(pricingObs.length * 4.5 + 13, notesLines.length * 4.5 + 13);

  checkSpace(pricingH + 5, "Observations & Pricing");
  drawListBlock("Pricing Observations", pricingObs, leftX, colW, pricingH);
  drawTextPanel("General Notes", notesLines, rightX, colW, pricingH);
  y += pricingH + 8;

  // ----------------------------------------------------
  // PAGE 3: COMPETITIVE LANDSCAPE
  // ----------------------------------------------------
  doc.addPage();
  y = 22;
  
  // running header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("CompeteIntel Market Intelligence Report", margin, 12);
  doc.text("Competitive Landscape", 210 - margin, 12, { align: 'right' });
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(margin, 14, 210 - margin, 14);

  drawSectionHeader("Discovered Competitors");

  if (competitors.length === 0) {
    const emptyH = 20;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, emptyH, 3, 3, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("No competitors discovered by pipeline.", margin + 6, y + 11);
    y += emptyH + 10;
  } else {
    // Width allocation: Name (32), Website (38), Confidence (22), Category (33), Reason (55)
    const colNameW = 32;
    const colWebW = 38;
    const colConfW = 22;
    const colCatW = 33;
    const colReasonW = 55;
    
    // Draw Header
    doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.rect(margin, y, contentWidth, 8.5, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    
    let cellX = margin + 3;
    doc.text("Name", cellX, y + 5.5);
    cellX += colNameW;
    doc.text("Website", cellX, y + 5.5);
    cellX += colWebW;
    doc.text("Confidence", cellX, y + 5.5);
    cellX += colConfW;
    doc.text("Category", cellX, y + 5.5);
    cellX += colCatW;
    doc.text("Relevance Reason", cellX, y + 5.5);
    
    y += 8.5;
    
    competitors.forEach((c, idx) => {
      const cName = c?.name || c?.company_name || `Competitor ${idx + 1}`;
      const cWeb = c?.website || c?.url || c?.domain || "—";
      const cConf = String(c?.confidence || "").toLowerCase();
      const cCat = c?.category || "—";
      const cReason = c?.reason || "—";
      
      const reasonLines = doc.splitTextToSize(cReason, colReasonW - 6);
      const catLines = doc.splitTextToSize(cCat, colCatW - 6);
      const nameLines = doc.splitTextToSize(cName, colNameW - 6);
      
      const maxRowLines = Math.max(reasonLines.length, catLines.length, nameLines.length, 1);
      const rowHeight = maxRowLines * 4.5 + 4;
      
      checkSpace(rowHeight, "Discovered Competitors");
      
      // bg color
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
      
      // bottom cell divider
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.25);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
      
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      
      let rowX = margin + 3;
      
      // Name
      doc.setFont('helvetica', 'bold');
      nameLines.forEach((l, lIdx) => {
        doc.text(l, rowX, y + 4.5 + lIdx * 4);
      });
      doc.setFont('helvetica', 'normal');
      
      // Website (hyperlink support)
      rowX += colNameW;
      if (cWeb !== "—") {
        doc.setTextColor(79, 70, 229);
        const webTrunc = cWeb.length > 21 ? cWeb.substring(0, 19) + "..." : cWeb;
        doc.text(webTrunc, rowX, y + 4.5);
        const textW = doc.getTextWidth(webTrunc);
        doc.link(rowX, y + 1.5, textW, 4, { url: cWeb.startsWith("http") ? cWeb : `https://${cWeb}` });
        doc.setTextColor(30, 41, 59);
      } else {
        doc.text("—", rowX, y + 4.5);
      }
      
      // Confidence Badge
      rowX += colWebW;
      if (cConf && cConf !== "—" && cConf !== "undefined") {
        let badgeBg = [241, 245, 249];
        let badgeTxt = [71, 85, 105];
        if (cConf === 'high') {
          badgeBg = [240, 253, 250];
          badgeTxt = [13, 148, 136];
        } else if (cConf === 'medium') {
          badgeBg = [254, 243, 199];
          badgeTxt = [217, 119, 6];
        }
        
        doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
        doc.roundedRect(rowX, y + 2.2, 15, 4.2, 1, 1, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(badgeTxt[0], badgeTxt[1], badgeTxt[2]);
        doc.text(cConf.toUpperCase(), rowX + 7.5, y + 5.2, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
      } else {
        doc.text("—", rowX, y + 4.5);
      }
      
      // Category
      rowX += colConfW;
      catLines.forEach((l, lIdx) => {
        doc.text(l, rowX, y + 4.5 + lIdx * 4);
      });
      
      // Reason
      rowX += colCatW;
      doc.setTextColor(71, 85, 105);
      reasonLines.forEach((l, lIdx) => {
        doc.text(l, rowX, y + 4.5 + lIdx * 4);
      });
      
      y += rowHeight;
    });
    
    y += 10;
  }

  // Selected competitor details (if enriched)
  const enrichedProfile = competitorDetails?.enriched_competitor;
  const pricingItem = competitorDetails?.pricing_item;
  
  if (enrichedProfile || pricingItem) {
    checkSpace(55, "Enriched Intelligence");
    drawSectionHeader("Enriched Competitor Intelligence");
    
    const compName = enrichedProfile?.name || "Selected Competitor";
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Enrichment Target: ${compName}`, margin, y);
    y += 5;
    
    const profileEntries = Object.entries(enrichedProfile || {})
      .filter(([k, v]) => isSimpleValue(v))
      .slice(0, 6);
      
    const pricingEntries = Object.entries(pricingItem || {})
      .filter(([k, v]) => isSimpleValue(v))
      .slice(0, 6);
      
    const maxEntries = Math.max(profileEntries.length, pricingEntries.length, 1);
    const boxHeight = 12 + maxEntries * 10;
    
    checkSpace(boxHeight + 5, "Enriched Intelligence");
    
    function drawKeyValueCard(title, entries, xX) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(xX, y, colW, boxHeight, 3, 3, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(title, xX + 4, y + 5.5);
      
      doc.setDrawColor(241, 245, 249);
      doc.line(xX + 4, y + 7.5, xX + colW - 4, y + 7.5);
      
      let entryY = y + 12;
      if (entries.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("No enriched details available.", xX + 4, entryY);
      } else {
        entries.forEach(([key, val]) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(formatKey(key), xX + 4, entryY);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          const valLines = doc.splitTextToSize(String(val), colW - 8);
          doc.text(valLines[0] || "—", xX + 4, entryY + 3.2);
          entryY += 9.5;
        });
      }
    }
    
    drawKeyValueCard("Profile Enrichment Profile", profileEntries, margin);
    drawKeyValueCard("Pricing Profile Details", pricingEntries, margin + colW + 6);
    
    y += boxHeight + 10;
  }

  // ----------------------------------------------------
  // PAGE 4: STRATEGIC RECOMMENDATIONS & NEXT STEPS
  // ----------------------------------------------------
  checkSpace(60, "Strategic Recommendations");
  drawSectionHeader("Strategic Recommendations & Insights");

  const competitivePos = insights?.competitive_positioning || "No competitive positioning details available.";
  const recommPos = insights?.recommended_positioning || "No recommended positioning details available.";
  
  const compPosLines = doc.splitTextToSize(competitivePos, colW - 8);
  const recommPosLines = doc.splitTextToSize(recommPos, colW - 8);
  const positioningH = Math.max(compPosLines.length * 4.5 + 13, recommPosLines.length * 4.5 + 13);

  checkSpace(positioningH + 5, "Strategic Recommendations");
  drawTextPanel("Competitive Positioning", compPosLines, leftX, colW, positioningH);
  drawTextPanel("Recommended Positioning", recommPosLines, rightX, colW, positioningH);
  y += positioningH + 8;

  const nextSteps = toArray(insights?.recommended_next_steps);
  const nextStepsH = Math.min(15 + nextSteps.length * 5.5, 60);

  checkSpace(nextStepsH + 5, "Strategic Recommendations");
  drawListBlock("Recommended Next Steps", insights?.recommended_next_steps, margin, contentWidth, nextStepsH);
  y += nextStepsH + 10;

  // ----------------------------------------------------
  // FOOTER & PAGE NUMBERING (MULTI-PAGE POST-PASS)
  // ----------------------------------------------------
  const totalPages = doc.internal.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Bottom footer divider
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setLineWidth(0.2);
    doc.line(margin, 282, 210 - margin, 282);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    
    // Left: date & note
    doc.text(`Confidential Intelligence Report  •  ${dateStr}`, margin, 287);
    
    // Right: Page X of Y
    doc.text(`Page ${i} of ${totalPages}`, 210 - margin, 287, { align: 'right' });
  }

  doc.save(fileName)
}
