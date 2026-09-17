import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { fields } from './schema.js';

export async function makeExcel(records) {
  const book = new ExcelJS.Workbook();
  book.creator = 'YPDC_AU_AACK';
  const sheet = book.addWorksheet('Applications', {views:[{state:'frozen',ySplit:1,xSplit:3}]});
  const columns = {id:'Application ID',submittedAt:'Submitted (UTC)',...fields};
  sheet.columns = Object.entries(columns).map(([key,header])=>({key,header,width:key==='id'?38:26}));
  for (const record of records) sheet.addRow(Object.fromEntries(Object.keys(columns).map(key=>[key,typeof record[key]==='boolean'?(record[key]?'Yes':'No'):String(record[key]??'')])));
  sheet.getRow(1).height = 34;
  sheet.getRow(1).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF063B2D'}};cell.font={bold:true,color:{argb:'FFFFFFFF'}};});
  sheet.eachRow((row,n)=>{row.alignment={vertical:'top',wrapText:true};if(n>1){row.height=60;if(n%2===0)row.eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F6EE'}};});}});
  sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:sheet.columnCount}};
  return Buffer.from(await book.xlsx.writeBuffer());
}

export function makePDF(records) {
  return new Promise((resolve,reject)=>{
    const doc = new PDFDocument({size:'A4',margin:45,bufferPages:true,info:{Title:'YPDC recruitment applications'}});
    const chunks=[];doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    const header=()=>{doc.font('Helvetica-Bold').fontSize(20).fillColor('#063b2d').text('YPDC_AU_AACK');doc.font('Helvetica').fontSize(10).fillColor('#52675d').text('Recruitment applications · Confidential');doc.moveDown(1.5);};
    header();
    if (!records.length) doc.fontSize(12).text('No applications received yet.');
    records.forEach((record,index)=>{
      if(index){doc.addPage();header();}
      doc.font('Helvetica-Bold').fontSize(15).fillColor('#063b2d').text(`${index+1}. ${record.name}`);
      doc.font('Helvetica').fontSize(9).fillColor('#52675d').text(`Reference: ${record.id}\nSubmitted: ${record.submittedAt}`);doc.moveDown();
      for(const [key,label] of Object.entries(fields)){
        const text=record[key]===true?'Yes':String(record[key]||'—');
        if(doc.y>doc.page.height-110){doc.addPage();header();}
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#063b2d').text(label);
        doc.font('Helvetica').fontSize(11).fillColor('#263d31').text(text,{width:505,lineGap:3});doc.moveDown(.65);
      }
    });
    doc.end();
  });
}
