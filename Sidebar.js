function bibliographySidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar html').setTitle('Bibliography');
  DocumentApp.getUi().showSidebar(html);
}

function bibliographyForSidebar() {
  const ui = DocumentApp.getUi();

  const doc = DocumentApp.getActiveDocument();
  const documentId = doc.getId();

  let result = validateLinks(validate = false, getparams = false, false);
  let validationSite, zoteroItemKey, zoteroItemGroup, zoteroItemKeyParameters, biblTexts;
  let bibReferences = [];
  if (!result.hasOwnProperty('status')){
    throw new Error('Error in validateLinks!');
  }
  
  if (result.status == 'ok') {
    validationSite = result.validationSite;
    zoteroItemKey = result.zoteroItemKey;
    zoteroItemGroup = result.zoteroItemGroup;
    zoteroItemKeyParameters = result.zoteroItemKeyParameters;
    targetRefLinks = result.targetRefLinks;
    //Logger.log('targetRefLinks=' + targetRefLinks);

    if (result.bibReferences.length > 0) {
      bibReferences = result.bibReferences;
      resultBiblTexts = forestAPIcall(validationSite, zoteroItemKey, zoteroItemGroup, bibReferences, documentId, targetRefLinks, mode = 'sidebar');
      if (resultBiblTexts.status == 'error') {
        ui.alert(resultBiblTexts.message);
        return 0;
      }
      biblTexts = resultBiblTexts.biblTexts;
    } else {
     // ui.alert('Links for bibliography weren\'t found.');
      //return 0;
      throw new Error('Links for bibliography weren\'t found.');
    }
  } else {
    throw new Error('Error in validateLinks!');
  }

  let workWithPar = true;
  let parIndex = 0;
  let html = '';
  for (let i = 0; i < biblTexts.length; i++) {
    if (biblTexts[i].text == '\n') {
      workWithPar = true;
    } else {

      if (workWithPar === true) {
        if (parIndex == 0) {
          html += '<p>';
        } else {
          html += '</p><p>';
        }
        html += biblTexts[i].text;
        parIndex++;
      } else {
        if (biblTexts[i].name == 'a') {
          html += `<a href="${biblTexts[i].link}" target="_blank">${biblTexts[i].text}</a>`;
        } else if (biblTexts[i].name == 'i') {
          html += `<i>${biblTexts[i].text}</i>`;
        } else {
          html += biblTexts[i].text;
        }
      }

      workWithPar = false;
    }
  }

  return html + '</p>';
}