function zoteroTransferDoc() {
  const ui = DocumentApp.getUi();
  try {
    const doc = DocumentApp.getActiveDocument();
    const body = doc.getBody();

    const clsCitationRegex = 'ITEM CSL_CITATION.*?}}}\\]}';
    const groupItemRegex = /groups\/([^\:\|]*)\/items\/([^\:\|]*)$/;

    let zoteroCitation, start, end, zoteroString, zoteroLongString, zoteroJson, linkText, groupItem, zoteroLink, counter = 0, startLink, endLink;

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

      zoteroLink = "https://ref.opendeved.net/zo/zg/" + groupId + "/7/" + itemKey + "/";
      zoteroLink = replaceAddParameter(zoteroLink, 'openin', 'zoteroapp');

      if (/^\(.*\)$/.test(linkText)) {
        linkText = linkText.substr(0, 1) + "⇡" + linkText.substr(1);
        startLink = 1;
        endLink = linkText.length - 2;
      } else {
        linkText = "⇡" + linkText;
        startLink = 0;
        endLink = linkText.length - 1;
      }

      // change this to text with url:
      newZoteroText = zoteroText.replace(zoteroLongString, linkText);
      zoteroCitation.getElement().asText().setText(newZoteroText).setLinkUrl(startLink, endLink, zoteroLink);

      zoteroCitation = body.findText(clsCitationRegex);
      counter++;
    }
    ui.alert(' Number of Zotero links: ' + counter);
  }
  catch (error) {
    ui.alert('Error in zoteroTransferDoc. ' + error);
  }
}