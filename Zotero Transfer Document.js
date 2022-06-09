function zoteroTransferDoc() {
  const ui = DocumentApp.getUi();
  try {
    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();

    const clsCitationRegex = 'ITEM CSL_CITATION.*?}}}\\]}';
    const groupItemRegex = /groups\/([^\:\|]*)\/items\/([^\:\|]*)$/;

    let zoteroCitation, start, end, zoteroString, zoteroLongString, zoteroJson, linkText, groupItem, zoteroLink, counter = 0;

    zoteroCitation = body.findText(clsCitationRegex);
    while (zoteroCitation) {
      start = zoteroCitation.getStartOffset();
      end = zoteroCitation.getEndOffsetInclusive();

      zoteroText = zoteroCitation.getElement().asText().getText();

      zoteroLongString = zoteroText.substring(start, end + 1);
      zoteroString = zoteroText.substring(start + 18, end + 1);
      zoteroJson = JSON.parse(zoteroString);

      linkText = zoteroJson.properties.plainCitation;
      url = String(zoteroJson.citationItems[0].uris);

      groupItem = url.match(groupItemRegex);
      groupId = groupItem[1];
      itemKey = groupItem[2];

// Elena: 
      zoteroLink = '⟦zg:' + groupId + ':' + itemKey + '|' + linkText + '⟧';
      //Logger.log(zoteroLink);

// var addBrackets = FALSE;
// if (linkText.match("^\(.*\)$")) {
//          remove brackets
//          addBrackets = TRUE
// };
//  urlText = "⇡"+ linkText;
//  zoteroLink = "https://ref.opendeved.net/zo/zg/" + 2129771 + "/7/" + T4Q5I92Z + "/" + linkText;
// var linkToInsert = insertLink(urlText, zoteroLink)
// if (addBrackets) {
//      linkToInsert = "(" + linkToInsert + ")"
// }


// change this to text with url:
      newZoteroText = zoteroText.replace(zoteroLongString, zoteroLink);
      zoteroCitation.getElement().asText().setText(newZoteroText);

      zoteroCitation = body.findText(clsCitationRegex);
      counter++;
    }
    ui.alert(' Number of Zotero links: ' + counter);
  }
  catch (error) {
    ui.alert('Error in zoteroTransferDoc. ' + error);
  }
}