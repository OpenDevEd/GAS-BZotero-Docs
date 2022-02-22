function testAddSrcToURL() {
  addSrcToURL('https://www.test.com', 'zotero', '8970789789', 'U7U8U9');
}

function addSrcToURL(url, targetRefLinks, srcParameter, zoteroCollectionKey) {
  Logger.log('targetRefLinks=' + targetRefLinks + ' srcParameter=' + srcParameter + ' zoteroCollectionKey=' + zoteroCollectionKey);

  if (srcParameter == '') {
    const checkSrc = /src=[a-zA-Z0-9:]+&?/.exec(url);
    //Logger.log(checkCollection);
    if (checkSrc != null) {
      url = url.replace(checkSrc[0], '');
    }
  } else {
    url = replaceAddParameter(url, 'src', srcParameter);
  }

  if (targetRefLinks == 'zotero') {
    url = replaceAddParameter(url, 'collection', zoteroCollectionKey);
    url = replaceAddParameter(url, 'openin', 'zoteroapp');
  } else {

    const checkCollection = /collection=[a-zA-Z0-9]+&?/.exec(url);
    if (checkCollection != null) {
      url = url.replace(checkCollection[0], '');
    }

    const checkOpenin = /openin=zoteroapp&?/.exec(url);
    if (checkOpenin != null) {
      url = url.replace(checkOpenin[0], '');
    }

  }

  // 2021-05-11 Update (if lastChar == '?')
  const lastChar = url.charAt(url.length - 1);
  if (lastChar == '&' || lastChar == '?') {
    url = url.slice(0, -1);
  }
  //Logger.log(url);

  return url;
}


function replaceAddParameter(url, name, srcParameter) {
  if (url.indexOf(srcParameter) == -1) {
    const srcPos = url.indexOf(name + '=');
    if (srcPos == -1) {
      const questionMarkPos = url.indexOf('?');
      //Logger.log(questionMarkPos);
      if (questionMarkPos == -1) {
        url += '?' + name + '=' + srcParameter;
      } else {
        if (url.length == (questionMarkPos + 1)) {
          url += name + '=' + srcParameter;
        } else {
          url += '&' + name + '=' + srcParameter;
        }
      }
    } else {
      const str = url.substr(srcPos + name.length + 1)
      //Logger.log(str);
      let replaceStr;
      const ampPos = str.indexOf('&');
      if (ampPos == -1) {
        replaceStr = str;
      } else {
        replaceStr = str.substr(0, ampPos);
        //Logger.log(replaceStr);
      }
      url = url.replace(replaceStr, srcParameter);
    }
  }
  return url;
}



function validateLinks(validate = true, getparams = true, markorphanedlinks = true) {
  console.time('validateLinks time')

  let bibReferences = [];
  let alreadyCheckedLinks = new Object();

  let ui = DocumentApp.getUi();
  try {
    // Task 9 2021-04-13 (1)
    let targetRefLinks = getDocumentPropertyString('target_ref_links');
    if (targetRefLinks == null) {
      targetRefLinks = 'zotero';
    }
    // Task 10 2021-04-13
    if (targetRefLinks == 'zotero' && validate && getparams) {
      // 2021-05-11 Update
      validate = false;
      const response = ui.alert('The reference links in this document point to the Zotero app', "Your links will only be rewritten; they will not be validated. If you are about to share this document with somebody who does not have access to the Zotero library, please switch the link target to ‘evidence library’ first.", ui.ButtonSet.OK_CANCEL);

      if (response == ui.Button.CANCEL) {
        return 0;
      }
    }
    // End. Task 10 2021-04-13

    // BZotero 2 Task 1
    let currentZoteroItemKey = getDocumentPropertyString('zotero_item');
    if (currentZoteroItemKey == null && !validate && !getparams) {
      //     addZoteroItemKey();
      scanForItemKey(targetRefLinks);
    } else if (currentZoteroItemKey == null && (validate || getparams)) {
      const addZoteroItemKeyResult = addZoteroItemKey(errorText = '', optional = true, bibliography = false, targetRefLinks);
      if (addZoteroItemKeyResult.status == 'stop') {
        return 0;
      }
    }

    // 2021-05-11 Update
    let zoteroItemKeyParameters, zoteroItemGroup, zoteroItemKey;
    currentZoteroItemKey = getDocumentPropertyString('zotero_item');
    if (currentZoteroItemKey == null) {
      if (targetRefLinks == 'zotero') {
        zoteroItemKeyParameters = '';
        zoteroItemGroup = '';
        zoteroItemKey = '';
      } else {
        return 0;
      }
    } else {
      const zoteroItemKeyParts = currentZoteroItemKey.split('/');
      zoteroItemKeyParameters = zoteroItemKeyParts[4] + ':' + zoteroItemKeyParts[6];
      zoteroItemGroup = zoteroItemKeyParts[4];
      zoteroItemKey = zoteroItemKeyParts[6];
    }
    // End. 2021-05-11 Update

    let zoteroCollectionKey;
    let currentZoteroCollectionKey = getDocumentPropertyString('zotero_collection_key');
    if (currentZoteroCollectionKey == null && targetRefLinks == 'zotero' && autoPromptCollection) {
      addZoteroCollectionKey('', true, false);
      currentZoteroCollectionKey = getDocumentPropertyString('zotero_collection_key');
      if (currentZoteroCollectionKey == null) {
        if (validate == true && getparams == true) {
          validate = false;
        }
      }
    }

    if (currentZoteroCollectionKey != null) {
      const zoteroCollectionKeyParts = currentZoteroCollectionKey.split('/');
      zoteroCollectionKey = zoteroCollectionKeyParts[6];
    } else {
      zoteroCollectionKey = '';
    }

    // End. Task 9 2021-04-13 (1)

    // BZotero Task 0
    // UserProperty -> DocumentProperty Update
    let validationSite = getDocumentPropertyString('kerko_validation_site');
    if (validationSite == null) {
      const activeUser = Session.getEffectiveUser().getEmail();
      if (activeUser.search(/edtechhub.org/i) != -1) {
        validationSite = 'https://docs.edtechhub.org/lib/';
      } else if (activeUser.search(/opendeved.net/i) != -1) {
        validationSite = 'https://docs.opendeved.net/lib/';
      } else {
        enterValidationSite();
        // UserProperty -> DocumentProperty Update
        validationSite = getDocumentPropertyString('kerko_validation_site');
        if (validationSite == null) {
          ui.alert('Please enter Validation site');
          return 0;
        }
      }

      //Logger.log('Default validationSite');
    }
    // End. BZotero Task 0   

    let notiText = '';
    let flagsObject = {
      notiTextOrphaned: false,
      notiTextURLChanged: false,
      notiTextBroken: false,
      notiTextUnknownLibrary: false,
      bibliographyExists: false,
      dontCollectLinksFlag: false
    };


    let result;
    let doc = DocumentApp.getActiveDocument();

    const body = doc.getBody();

    let rangeElementStart = body.findText(textToDetectStartBib);
    let rangeElementEnd = body.findText(textToDetectEndBib);

    console.log('next version test');

    if (rangeElementStart != null && rangeElementEnd != null) {
      flagsObject.bibliographyExists = true;
      console.log('flagsObject.bibliographyExists = true;');
    } else {
      console.log('flagsObject.bibliographyExists = false;');
    }

    // Body
    result = findLinksToValidate(body, validate, getparams, markorphanedlinks, bibReferences, alreadyCheckedLinks, validationSite, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey, flagsObject);
    if (result.status == 'error') {
      ui.alert(result.message);
      return 0;
    }
    // End. Body

    // Footnotes
    const footnotes = doc.getFootnotes();
    let footnote, numChildren;
    for (let i in footnotes) {
      footnote = footnotes[i].getFootnoteContents();
      numChildren = footnote.getNumChildren();
      for (let j = 0; j < numChildren; j++) {
        result = findLinksToValidate(footnote.getChild(j), validate, getparams, markorphanedlinks, bibReferences, alreadyCheckedLinks, validationSite, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey, flagsObject);
        if (result.status == 'error') {
          ui.alert(result.message);
          return 0;
        }
      }
    }
    // End. Footnotes
    Logger.log('bibReferences ' + bibReferences);


    if (validate === true || getparams === true || markorphanedlinks === true) {
      console.timeEnd('validateLinks time')
      if (flagsObject.notiTextBroken) {
        notiText = 'There were broken links. Please search for BROKEN_LINK.';
      }
      if (flagsObject.notiTextOrphaned) {
        notiText += '\nThere were orphaned links. Please search for ORPHANED_LINK.';
      }
      if (flagsObject.notiTextURLChanged) {
        notiText += '\nThere were URL changed links. Please search for URL_CHANGED_LINK.';
      }
      if (flagsObject.notiTextUnknownLibrary) {
        notiText += '\nThere were unknown libraries. Please search for UNKNOWN_LIBRARY.';
      }
      if (notiText != '') {
        ui.alert(notiText);
      }
    }
    if (validate === false || getparams === false || markorphanedlinks === true) {
      Logger.log('targetRefLinks (validate links)' + targetRefLinks);
      return { status: 'ok', bibReferences: bibReferences, validationSite: validationSite, zoteroItemGroup: zoteroItemGroup, zoteroItemKey: zoteroItemKey, zoteroItemKeyParameters: zoteroItemKeyParameters, targetRefLinks: targetRefLinks };
    }


  }
  catch (error) {
    ui.alert('Error in validateLinks: ' + error);
    return { status: 'error', message: error }
  }
}


function checkHyperlinkNew(url, element, start, end, validate, getparams, markorphanedlinks, bibReferences, alreadyCheckedLinks, validationSite, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey, flagsObject, previousLinks) {
  // Logger.log(validate + ' ' + getparams + ' ' + markorphanedlinks);
  // Logger.log('url ' + url);
  let linkText, previousLinkIndex, flagMarkOrphanedLinks = false;
  if (markorphanedlinks) {
    linkText = element.getText().substr(start, end - start + 1);
    //Logger.log(linkText);

    // If there is an isolated whitespace (or more whitespaces) with a link
    if (linkText.match(/^\s+$/)) {
      //brokenOrphanedLinks.push({ segmentId: segmentId, startIndex: item.startIndex, text: ORPHANED_LINK_MARK });
      // element.insertText(start, ORPHANED_LINK_MARK).setAttributes(start, start + ORPHANED_LINK_MARK.length - 1, LINK_MARK_STYLE_NEW);
      flagMarkOrphanedLinks = true;
    }
    // End. If there is an isolated whitespace (or more whitespaces) with a link

    previousLinkIndex = previousLinks.length - 1;
    if (previousLinks.length > 0) {
      // if (item.startIndex == previousLinks[previousLinkIndex].endIndex && previousLinks[previousLinkIndex].url != url && !previousText.match(/^\s+$/) && !item.textRun.content[0].match(/^\s+$/) && currentParagraph == previousLinks[previousLinkIndex].paragraphNumber) {
      //   brokenOrphanedLinks.push({ segmentId: segmentId, startIndex: item.startIndex, text: URL_CHANGED_LINK_MARK });
      // }
      if (!flagMarkOrphanedLinks && previousLinks[previousLinkIndex].start == end + 1 && previousLinks[previousLinkIndex].url != url && !previousLinks[previousLinkIndex].linkText.match(/^\s+$/) && !previousLinks[previousLinkIndex].linkText[0].match(/^\s+$/)) {
        element.insertText(end + 1, URL_CHANGED_LINK_MARK).setLinkUrl(end + 1, end + URL_CHANGED_LINK_MARK.length, null).setAttributes(end + 1, end + URL_CHANGED_LINK_MARK.length, LINK_MARK_STYLE_NEW);
        flagsObject.notiTextURLChanged = true;
        //element.setLinkUrl(start, end, urlWithParameters);
      }
    }

    previousLinks.push({ url: url, start: start, end: end, linkText: linkText });
    //Logger.log(previousLinks);
  }


  let urlRegEx = new RegExp('https?://ref.opendeved.net/zo/zg/[0-9]+/7/[^/]+/?', 'i');
  if (url.search(urlRegEx) == 0) {
    //Logger.log('Yes----------------------');

    if (alreadyCheckedLinks.hasOwnProperty(url)) {
      result = alreadyCheckedLinks[url];
    } else {
      result = checkLink(url, validationSite, validate);
      if (result.status == 'error') {
        return result;
      }
      alreadyCheckedLinks[url] = result;

      // Logger.log('alreadyCheckedLinks' + JSON.stringify(alreadyCheckedLinks));
    }

    if (bibReferences.indexOf(result.bibRef) == -1) {
      bibReferences.push(result.bibRef);
    }

    // Task 9 2021-04-13
    if (!validate || result.type == 'BROKEN LINK') {
      urlWithParameters = addSrcToURL(url, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey);
    } else {
      urlWithParameters = addSrcToURL(result.url, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey);
    }
    // End. Task 9 2021-04-13

    if (validate || getparams) {
      //Logger.log('element.setLinkUrl(start, end, urlWithParameters); ' + urlWithParameters);
      element.setLinkUrl(start, end, urlWithParameters);
      element.setUnderline(start, end, false);
    }

    // 2021-05-11 Update
    if (result.type == 'BROKEN LINK' && validate) {
      //Logger.log('BROKEN LINK');
      element.insertText(start, BROKEN_LINK_MARK).setLinkUrl(start, start + BROKEN_LINK_MARK.length - 1, null).setAttributes(start, start + BROKEN_LINK_MARK.length - 1, LINK_MARK_STYLE_NEW);
      flagsObject.notiTextBroken = true;
    }

    if (result.permittedLibrary == false) {
      //Logger.log('result.permittedLibrary == false');
      element.insertText(start, UNKNOWN_LIBRARY_MARK).setAttributes(start, start + UNKNOWN_LIBRARY_MARK.length - 1, LINK_MARK_STYLE_NEW);
      flagsObject.notiTextUnknownLibrary = true;
    }
  }

  if (flagMarkOrphanedLinks) {
    element.insertText(start, ORPHANED_LINK_MARK).setAttributes(start, start + ORPHANED_LINK_MARK.length - 1, LINK_MARK_STYLE_NEW);
    flagsObject.notiTextOrphaned = true;
  }
  return { status: 'ok' };
}


function checkLink(url, validationSite, validate) {
  let urlOut, itemKeyOut;
  let opendevedPartLink, itemKeyIn, groupIdIn;

  let validationSiteRegEx = new RegExp(validationSite, 'i');
  let opendevedRgEx = new RegExp('http[s]*://ref.opendeved.net/zo/zg/', 'i');

  opendevedPartLink = url.replace(opendevedRgEx, '');
  let array = opendevedPartLink.split('/');
  groupIdIn = array[0];
  itemKeyIn = array[2];
  const questionPos = itemKeyIn.indexOf('?');
  if (questionPos != -1) {
    itemKeyIn = itemKeyIn.slice(0, questionPos);
  }

  // New code Adjustment of broken links  2021-05-03
  let new_Url;
  if (groupIdIn == '2405685' || groupIdIn == '2129771') {
    newUrl = validationSite + itemKeyIn;
  } else {
    newUrl = validationSite + groupIdIn + ':' + itemKeyIn;
  }
  // Logger.log('newUrl=' + newUrl);
  // End. New code Adjustment of broken links  2021-05-03 

  // 2021-05-11 Update
  let result;
  if (validate) {
    //Logger.log('Validation!');
    result = detectRedirect(newUrl);
    if (result.status == 'error') {
      return result;
    }
  } else {
    //Logger.log('Without validation');
    result = { status: 'ok', type: 'NORMAL LINK' };
  }
  // End. 2021-05-11 Update

  let resultDetectGroupId = detectGroupId(validationSite);
  if (resultDetectGroupId.status == 'error') {
    return resultDetectGroupId;
  }
  let grourIdOut = resultDetectGroupId.grourId;

  if (validate && result.type == 'NORMAL LINK') {
    urlOut = result.url;
    if (urlOut.search(validationSiteRegEx) != 0) {
      return { status: 'error', message: 'Unexpected redirect URL ' + urlOut + ' for link ' + url + ' Script expects ' + validationSite };
    }
    itemKeyOut = urlOut.replace(validationSiteRegEx, '');
    if (itemKeyOut.indexOf('/') != -1) {
      itemKeyOut = itemKeyOut.split('/')[0];
    }

    url = url.replace(groupIdIn, grourIdOut);
    url = url.replace(itemKeyIn, itemKeyOut);

    result.url = url;
  } else {
    grourIdOut = groupIdIn;
    itemKeyOut = itemKeyIn;
  }

  // 2021-05-14 Update
  //permittedLibraries
  let permittedLibrary = false;
  for (let i in permittedLibraries) {
    if (validationSite.indexOf(permittedLibraries[i].Domain) != -1) {
      if (permittedLibraries[i].Permitted.indexOf(grourIdOut) != -1) {
        permittedLibrary = true;
        break;
      }
    }
  }
  //Logger.log(grourIdOut + ' permittedLibrary=' + permittedLibrary);
  result.permittedLibrary = permittedLibrary;
  // End. 2021-05-14 Update

  // BZotero 2 Task 2
  result.bibRef = grourIdOut + ':' + itemKeyOut;

  return result;
}

function detectGroupId(validationSite) {
  let grourIdOut;
  if (validationSite == 'https://docs.opendeved.net/lib/') {
    grourIdOut = '2129771';
  } else if (validationSite == 'https://docs.edtechhub.org/lib/') {
    grourIdOut = '2405685';
  } else {
    return { status: 'error', message: 'Incorrect validation site.' };
  }
  return { status: 'ok', grourId: grourIdOut };
}

function detectRedirect(url) {
  try {
    //Logger.log('detectRedirect' + url);
    let redirect;
    let response = UrlFetchApp.fetch(url, { 'followRedirects': false, 'muteHttpExceptions': true });
    //Logger.log(response.getResponseCode());

    if (response.getResponseCode() == 404) {
      //Logger.log('response.getResponseCode() == 404');
      return { status: 'ok', type: 'BROKEN LINK' }
    } else {
      let headers = response.getAllHeaders();
      if (headers.hasOwnProperty('Refresh')) {
        //Logger.log('Redirect' + headers['Refresh']);
        if (headers['Refresh'].search('0; URL=') == 0) {
          redirect = headers['Refresh'].replace('0; URL=', '');
          //Logger.log('  ' + redirect);
          return detectRedirect(redirect);
        }
      } else if (headers.hasOwnProperty('Location')) {
        redirect = headers['Location'];
        //Logger.log('  ' + redirect);
        return detectRedirect(redirect);
      } else {
        //Logger.log('no Redirect');
        return { status: 'ok', type: 'NORMAL LINK', url: url }
      }
    }
  }
  catch (error) {
    return { status: 'error', message: 'Error in detectRedirect: ' + error }
  }
}


function findLinksToValidate(element, validate, getparams, markorphanedlinks, bibReferences, alreadyCheckedLinks, validationSite, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey, flagsObject) {

  let text, end, indices, partAttributes, numChildren, result;
  let previousLinks = [];

  const elementType = String(element.getType());

  if (elementType == 'TEXT') {

    // Is the text bibliography?
    if (flagsObject.bibliographyExists === true) {

      if (flagsObject.dontCollectLinksFlag === false && element.getText().includes(textToDetectStartBib)) {
        flagsObject.dontCollectLinksFlag = true;
        Logger.log('⁅bibliography:start⁆');
      }
      if (flagsObject.dontCollectLinksFlag === true && element.getText().includes(textToDetectEndBib)) {
        flagsObject.dontCollectLinksFlag = false;
        Logger.log('⁅bibliography:end⁆');
      }
    }

    if (flagsObject.dontCollectLinksFlag === true) {
      Logger.log('dontCollectLinksFlag = true');
      return 0;
    }
    // End. Is the text bibliography?

    indices = element.getTextAttributeIndices();

    for (let i = indices.length - 1; i >= 0; i--) {
      partAttributes = element.getAttributes(indices[i]);
      if (partAttributes.LINK_URL) {

        if (i == indices.length - 1) {
          text = element.getText();
          end = text.length - 1;
        } else {
          end = indices[i + 1] - 1;
        }

        result = checkHyperlinkNew(partAttributes.LINK_URL, element, indices[i], end, validate, getparams, markorphanedlinks, bibReferences, alreadyCheckedLinks, validationSite, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey, flagsObject, previousLinks);
        if (result.status == 'error') {
          return result;
        }
      }
    }
  } else {
    const arrayTypes = ['BODY_SECTION', 'PARAGRAPH', 'LIST_ITEM', 'TABLE', 'TABLE_ROW', 'TABLE_CELL'];
    if (arrayTypes.includes(elementType)) {
      numChildren = element.getNumChildren();
      for (let i = 0; i < numChildren; i++) {
        result = findLinksToValidate(element.getChild(i), validate, getparams, markorphanedlinks, bibReferences, alreadyCheckedLinks, validationSite, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey, flagsObject);
        if (result.status == 'error') {
          return result;
        }
      }
    }
  }
  return { status: 'ok' }
}
