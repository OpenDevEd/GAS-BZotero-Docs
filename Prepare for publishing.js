function prepareForPublishing() {

  let targetRefLinks = getDocumentPropertyString('target_ref_links');
 
  if (targetRefLinks != 'kerko') {
    setDocumentPropertyString('target_ref_links', 'kerko');
    onOpen();
  }

  universalInsertUpdateBibliography(validate = true, getparams = true);

  removeUnderlineFromHyperlinks();
}