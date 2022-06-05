function validateLinksTestHelper() {
  let linksArray = [];
  const doc = DocumentApp.getActiveDocument();

  const element = doc.getBody();
  testingFindAllLinks(element, 'body', linksArray);


  const footnotes = doc.getFootnotes();
  let footnote, numChildren;
  for (let i in footnotes) {
    footnote = footnotes[i].getFootnoteContents();
    numChildren = footnote.getNumChildren();
    for (let j = 0; j < numChildren; j++) {
      testingFindAllLinks(footnote.getChild(j), 'footnotes', linksArray);
    }
  }


  //Logger.log(linksArray);
  let allLinks = '';
  for (let i in linksArray) {
    allLinks += `
    <br>
        ${linksArray[i].linkText.replace('<','&lt;').replace('>','&gt;')}
    <br>
        <a target="_blank" href="${linksArray[i].link}">${linksArray[i].link}</a>
    <br>
    `;
  }

  let html = `<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
  </head>
  <body>
  ${allLinks}
  </body>
</html>`;
  html = HtmlService.createHtmlOutput(html).setWidth(800).setHeight(800);
  DocumentApp.getUi().showModalDialog(html, 'Links');
}

function testingFindAllLinks(element, source, linksArray) {

  let text, end, indices, partAttributes, numChildren;
  const elementType = String(element.getType());

  if (elementType == 'TEXT') {

    indices = element.getTextAttributeIndices();
    //Logger.log(indices);
    for (let i = 0; i < indices.length; i++) {
      partAttributes = element.getAttributes(indices[i]);
      //Logger.log(partAttributes);
      if (partAttributes.LINK_URL) {

        text = element.getText();
        if (i == indices.length - 1) {
          end = text.length - 1;
        } else {
          end = indices[i + 1] - 1;
        }

        linksArray.push({ link: partAttributes.LINK_URL, linkText: text.substr(indices[i], end - indices[i] + 1), source: source });
      }
    }
  } else {
    const arrayTypes = ['BODY_SECTION', 'PARAGRAPH', 'LIST_ITEM', 'TABLE', 'TABLE_ROW', 'TABLE_CELL'];
    if (arrayTypes.includes(elementType)) {
      numChildren = element.getNumChildren();
      for (let i = 0; i < numChildren; i++) {
        testingFindAllLinks(element.getChild(i), source, linksArray);
      }
    }
  }
}