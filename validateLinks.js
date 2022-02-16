function testAddSrcToURL() {
  addSrcToURL('https://www.test.com', 'zotero', '8970789789', 'U7U8U9');
}

function addSrcToURL(url, targetRefLinks, srcParameter, zoteroCollectionKey) {

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
    //Logger.log(checkCollection);
    if (checkCollection != null) {
      url = url.replace(checkCollection[0], '');
    }

    const checkOpenin = /openin=zoteroapp&?/.exec(url);
    //Logger.log(checkOpenin);
    if (checkOpenin != null) {
      url = url.replace(checkOpenin[0], '');
    }

  }

  // 2021-05-11 Update (if lastChar == '?')
  const lastChar = url.charAt(url.length - 1);
  if (lastChar == '&' || lastChar == '?') {
    url = url.slice(0, -1);
  }
  Logger.log(url);

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
    } else if (currentZoteroItemKey == null && validate && getparams) {
      //Logger.log("addZoteroItemKey(errorText = '', optional=true, bibliography=false, targetRefLinks)");
      const addZoteroItemKeyResult = addZoteroItemKey(errorText = '', optional = true, bibliography = false, targetRefLinks);
      if (addZoteroItemKeyResult == 'abortValidation') {
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


    let requests = [];

    let previousLinks = [];
    let brokenOrphanedLinks = [];
    let notiTextOrphaned, notiTextURLChanged, notiTextBroken, notiTextUnknownLibrary, notiText = '';
    let currentParagraph = -1;

    let result;
    let dontCollectLinks = false;
    let doc = DocumentApp.getActiveDocument();
    let documentId = doc.getId();
    let document = Docs.Documents.get(documentId);

    let bodyElements = document.body.content;

    let allFootnotes = document.footnotes;
    for (let footnoteId in allFootnotes) {
      currentParagraph = footnoteId;
      allFootnotes[footnoteId].content.forEach(function (content) {
        content.paragraph.elements.forEach(function (item) {
          result = checkHyperlink(requests, markorphanedlinks, bibReferences, alreadyCheckedLinks, item, validationSite, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey, validate, getparams, previousLinks, brokenOrphanedLinks, currentParagraph, footnoteId);
          if (result.status == 'error') {
            ui.alert(result.message);
            return 0;
          }
        });
      });
    }

    for (let i in bodyElements) {
      // If body element contains table
      if (bodyElements[i].table) {
        if (bodyElements[i].table.tableRows) {
          for (let j in bodyElements[i].table.tableRows) {
            if (bodyElements[i].table.tableRows[j].tableCells) {
              for (let k in bodyElements[i].table.tableRows[j].tableCells) {
                if (bodyElements[i].table.tableRows[j].tableCells[k].content) {
                  for (let l in bodyElements[i].table.tableRows[j].tableCells[k].content) {
                    if (bodyElements[i].table.tableRows[j].tableCells[k].content[l].paragraph) {
                      if (bodyElements[i].table.tableRows[j].tableCells[k].content[l].paragraph.elements) {
                        bodyElements[i].table.tableRows[j].tableCells[k].content[l].paragraph.elements.forEach(function (item) {
                          result = checkHyperlink(requests, markorphanedlinks, bibReferences, alreadyCheckedLinks, item, validationSite, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey, validate, getparams, previousLinks, brokenOrphanedLinks, currentParagraph);
                          if (result.status == 'error') {
                            ui.alert(result.message);
                            return 0;
                          }
                        })
                      }
                    }
                  }
                }
              }
            }
          }

        }
      }
      // End. If body element contains table

      // If body element contains paragraph
      if (bodyElements[i].paragraph) {
        currentParagraph = Number(i);
        if (bodyElements[i].paragraph.elements) {
          bodyElements[i].paragraph.elements.forEach(function (item) {
            // Logger.log(item);
            if (item.textRun) {
              // Logger.log(item.textRun);

              if (item.textRun.content) {
                if (dontCollectLinks === false && item.textRun.content.indexOf('⁅bibliography:start⁆') != -1) {
                  dontCollectLinks = true;
                  // Logger.log('⁅bibliography:start⁆');
                }
                if (dontCollectLinks === true && item.textRun.content.indexOf('⁅bibliography:end⁆') != -1) {
                  dontCollectLinks = false;
                  //Logger.log('⁅bibliography:end⁆');
                }
              }
              // if (item.textRun.content){
              //   previousText = item.textRun.content;
              // }else{

              // }

              if (dontCollectLinks === false) {
                result = checkHyperlink(requests, markorphanedlinks, bibReferences, alreadyCheckedLinks, item, validationSite, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey, validate, getparams, previousLinks, brokenOrphanedLinks, currentParagraph);
                if (result.status == 'error') {
                  ui.alert(result.message);
                  return 0;
                }
              }
            }
          });
        }
      }
      // End. If body element contains paragraph
    }

    // Previous version
    // for (let i = brokenLinkStartIndexes.length - 1; i >= 0; i--) {
    //   //    Logger.log('brokenLinkSegments[i] ' + brokenLinkSegments[i])
    //   requests.push(
    //     {
    //       insertText: {
    //         text: '<BROKEN LINK>',
    //         location: {
    //           index: brokenLinkStartIndexes[i],
    //           segmentId: brokenLinkSegments[i]
    //         }
    //       }
    //     },
    //     {
    //       updateTextStyle: {
    //         range: {
    //           startIndex: brokenLinkStartIndexes[i],
    //           endIndex: brokenLinkStartIndexes[i] + 13,
    //           segmentId: brokenLinkSegments[i]
    //         },
    //         text_style: {
    //           backgroundColor: {
    //             color: {
    //               rgbColor: {
    //                 red: 1.0
    //               }
    //             }
    //           },
    //         },
    //         fields: 'backgroundColor'
    //       }
    //     }
    //   );
    // }

    for (let i = brokenOrphanedLinks.length - 1; i >= 0; i--) {
      //    Logger.log('brokenLinkSegments[i] ' + brokenLinkSegments[i])
      if (brokenOrphanedLinks[i].text == BROKEN_LINK_MARK || markorphanedlinks === true) {
        requests.push(
          {
            insertText: {
              text: brokenOrphanedLinks[i].text,
              location: {
                index: brokenOrphanedLinks[i].startIndex,
                segmentId: brokenOrphanedLinks[i].segmentId
              }
            }
          },
          {
            updateTextStyle: {
              range: {
                startIndex: brokenOrphanedLinks[i].startIndex,
                endIndex: brokenOrphanedLinks[i].startIndex + brokenOrphanedLinks[i].text.length,
                segmentId: brokenOrphanedLinks[i].segmentId
              },
              text_style: LINK_MARK_STYLE,
              fields: LINK_MARK_FIELDS,
            }
          }
        );
        if (brokenOrphanedLinks[i].text == ORPHANED_LINK_MARK) {
          // requests[requests.length - 1] = {
          //   updateTextStyle: {
          //     range: {
          //       startIndex: brokenOrphanedLinks[i].startIndex,
          //       endIndex: brokenOrphanedLinks[i].startIndex + brokenOrphanedLinks[i].text.length,
          //       segmentId: brokenOrphanedLinks[i].segmentId
          //     },
          //     text_style: LINK_MARK_STYLE,
          //     fields: LINK_MARK_FIELDS, 
          //   }
          // };
          notiTextOrphaned = true;
        }else if (brokenOrphanedLinks[i].text == URL_CHANGED_LINK_MARK){
          notiTextURLChanged = true;
        }else if (brokenOrphanedLinks[i].text == BROKEN_LINK_MARK) {
          notiTextBroken = true;
        } else {
          notiTextUnknownLibrary = true;
        }
      }
    }

    //Logger.log('bibReferences ' + bibReferences);
    if (validate === true || getparams === true || markorphanedlinks === true) {
      if (requests.length > 0) {
        Docs.Documents.batchUpdate({
          requests: requests
        }, documentId);
      }
      console.timeEnd('validateLinks time')
      if (brokenOrphanedLinks.length > 0) {
        if (notiTextBroken) {
          notiText = 'There were broken links. Please search for BROKEN_LINK.';
        }
        if (notiTextOrphaned) {
          notiText += '\nThere were orphaned links. Please search for ORPHANED_LINK.';
        }
        if (notiTextURLChanged){
          notiText += '\nThere were URL changed links. Please search for URL_CHANGED_LINK.';
        }
        if (notiTextUnknownLibrary) {
          notiText += '\nThere were unknown libraries. Please search for UNKNOWN_LIBRARY.';
        }
        if (notiText != '') {
          ui.alert(notiText);
        }
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


let previousText = '';
function checkHyperlink(requests, markorphanedlinks, bibReferences, alreadyCheckedLinks, item, validationSite, targetRefLinks, zoteroItemKeyParameters, zoteroCollectionKey, validate, getparams, previousLinks, brokenOrphanedLinks, currentParagraph, segmentId) {
  let url, result, urlWithParameters, previousLinkIndex;
  let urlRegEx = new RegExp('https?://ref.opendeved.net/zo/zg/[0-9]+/7/[^/]+/?', 'i');
  //Logger.log(item);
  // Fixing for issue described in "Bug report :)"
  if (item.textRun) {
    if (item.textRun.textStyle) {
      if (item.textRun.textStyle.link) {
        if (item.textRun.textStyle.link.url) {
          url = item.textRun.textStyle.link.url;
          //Logger.log('url=' + url);

          // ORPHANED LINKS 2021-06-04
          if (markorphanedlinks) {
            //Logger.log('previousLinks= ' + JSON.stringify(previousLinks));
            previousLinkIndex = previousLinks.length - 1;
            if (previousLinkIndex >= 0) {
              // Logger.log(item.startIndex - previousLinks[previousLinkIndex].endIndex);
              // Logger.log('currentParagraph=' + currentParagraph);

              // If there is an isolated whitespace (or more whitespaces) with a link
              if (item.textRun.content.match(/^\s+$/)) {
                brokenOrphanedLinks.push({ segmentId: segmentId, startIndex: item.startIndex, text: ORPHANED_LINK_MARK });
              }
              // End. If there is an isolated whitespace (or more whitespaces) with a link
              // If two URLs run into each other
              else if (item.startIndex == previousLinks[previousLinkIndex].endIndex && previousLinks[previousLinkIndex].url != url && !previousText.match(/^\s+$/) && !item.textRun.content[0].match(/^\s+$/) && currentParagraph == previousLinks[previousLinkIndex].paragraphNumber) {
                brokenOrphanedLinks.push({ segmentId: segmentId, startIndex: item.startIndex, text: URL_CHANGED_LINK_MARK });
              }
              // End. If two URLs run into each other
              // Prevent unnecessary mark in case <a href="URL_A">ABCDEFG</a><a href="URL_B"> </a><a href="URL_B">HIJKLMN</a>
              else {
                if (previousText.match(/^\s+$/) && previousLinks[previousLinkIndex].url == url && item.startIndex == previousLinks[previousLinkIndex].endIndex && currentParagraph == previousLinks[previousLinkIndex].paragraphNumber) {
                  if (brokenOrphanedLinks.length >= 1 && brokenOrphanedLinks[brokenOrphanedLinks.length - 1].text == ORPHANED_LINK_MARK) {
                    brokenOrphanedLinks.pop();
                  } else if (brokenOrphanedLinks.length >= 2 && brokenOrphanedLinks[brokenOrphanedLinks.length - 2].text == ORPHANED_LINK_MARK) {
                    brokenOrphanedLinks.splice(brokenOrphanedLinks.length - 2, 1);
                  }
                }
              }
              // End. Prevent unnecessary mark in case <a href="URL_A">ABCDEFG</a><a href="URL_B"> </a><a href="URL_B">HIJKLMN</a>


            }
            previousLinks.push({ url: url, startIndex: item.startIndex, endIndex: item.endIndex, paragraphNumber: currentParagraph });
          }
          // End. ORPHANED LINKS 2021-06-04

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
              item.textRun.textStyle.underline = false;
              item.textRun.textStyle.link.url = urlWithParameters;
              requests.push({
                updateTextStyle: {
                  textStyle: item.textRun.textStyle,
                  range: {
                    startIndex: item.startIndex,
                    endIndex: item.endIndex
                  },
                  fields: '*'
                }
              });
              if (segmentId) {
                requests[requests.length - 1].updateTextStyle.range.segmentId = segmentId;
              }

            }

            // 2021-05-11 Update
            // Previous if (result.type == 'BROKEN LINK') {
            if (result.type == 'BROKEN LINK' && validate) {
              brokenOrphanedLinks.push({ segmentId: segmentId, startIndex: item.startIndex, text: BROKEN_LINK_MARK });
            }

            if (result.permittedLibrary == false) {
              brokenOrphanedLinks.push({ segmentId: segmentId, startIndex: item.startIndex, text: UNKNOWN_LIBRARY_MARK });
            }

          }
        }
      }
    }
    previousText = item.textRun.content ? item.textRun.content : '';
    // Fixing for issue described in "Bug report :)"

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

  // let newUrl = validationSite + groupIdIn + ':' + itemKeyIn;

  // New code Adjustment of broken links  2021-05-03
  let new_Url;
  if (groupIdIn == '2405685' || groupIdIn == '2129771') {
    newUrl = validationSite + itemKeyIn;
  } else {
    newUrl = validationSite + groupIdIn + ':' + itemKeyIn;
  }
  Logger.log('newUrl=' + newUrl);
  // End. New code Adjustment of broken links  2021-05-03 

  // 2021-05-11 Update
  let result;
  if (validate) {
    Logger.log('Validation!');
    result = detectRedirect(newUrl);
    if (result.status == 'error') {
      return result;
    }
  } else {
    Logger.log('Without validation');
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
  Logger.log(grourIdOut + ' permittedLibrary=' + permittedLibrary);
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
    Logger.log(url);
    let redirect;
    let response = UrlFetchApp.fetch(url, { 'followRedirects': false, 'muteHttpExceptions': true });
    //Logger.log(response.getResponseCode());

    if (response.getResponseCode() == 404) {
      Logger.log('response.getResponseCode() == 404');
      return { status: 'ok', type: 'BROKEN LINK' }
    } else {
      let headers = response.getAllHeaders();
      if (headers.hasOwnProperty('Refresh')) {
        Logger.log('Redirect' + headers['Refresh']);
        if (headers['Refresh'].search('0; URL=') == 0) {
          redirect = headers['Refresh'].replace('0; URL=', '');
          Logger.log('  ' + redirect);
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

