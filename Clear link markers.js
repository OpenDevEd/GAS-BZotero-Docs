function clearLinkMarkers() {
  const ui = DocumentApp.getUi();
  try{
  const doc = DocumentApp.getActiveDocument();

  doc.replaceText(ORPHANED_LINK_MARK, '');
  doc.replaceText(URL_CHANGED_LINK_MARK, '');
  doc.replaceText(BROKEN_LINK_MARK, '');
  doc.replaceText(UNKNOWN_LIBRARY_MARK, '');

  const footnotes = doc.getFootnotes();
  let footnote;
  for (let i in footnotes){
    footnote = footnotes[i].getFootnoteContents();
    footnote.replaceText(ORPHANED_LINK_MARK, '');
    footnote.replaceText(URL_CHANGED_LINK_MARK, '');
    footnote.replaceText(BROKEN_LINK_MARK, '');
    footnote.replaceText(UNKNOWN_LIBRARY_MARK, '');
  }
  }
  catch (error) {
    ui.alert('Error in clearLinkMarkers: ' + error);
  }
}


function removeCountryMarkers() {
  singleReplace("⇡[^⇡:]+: ?","⇡",true,false,false);
  
}

