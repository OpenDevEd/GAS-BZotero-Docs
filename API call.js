function forestAPIcall(validationSite, zoteroItemKey, zoteroItemGroup, bibReferences, docOrPresoId, target, mode = 'bib') {
  try {
    const groupkeys = bibReferences.join(',');
    const activeUser = Session.getActiveUser().getEmail();
    const token = BIBAPI_TOKEN;

    const activeUserDomain = String(activeUser).split('@')[1];

    if (activeUserDomain != 'edtechhub.org' && activeUserDomain != 'opendeved.net') {
      return { status: 'error', message: 'Access denied! You can\'t use Forest API.' };
    }

    let apiCall = 'https://forest.opendeved.net/api?&user=' + activeUser
      + '&zkey=' + zoteroItemKey + '&zgroup=' + zoteroItemGroup
      + '&gdoc=' + docOrPresoId + '&token=' + token + '&groupkeys=' + groupkeys + '&target=' + target + '&mode=' + mode;

    if (apiCall.length > 2048) {
      return { status: 'error', message: 'This document has too many references. Please check for alternatives with your systems administrator.' };
    }

    const response = UrlFetchApp.fetch(apiCall, { 'muteHttpExceptions': true });
    const code = response.getResponseCode();
    let biblTexts = [];

    if (code == 200) {
      let jsonResponse = JSON.parse(response.getContentText());
      if (jsonResponse.status == 0) {
        /*
        Björn
        jsonResponse = {
          "status": 0,
          "count": 25,
          "duration": 2.645,
          "data": { }
        }
      */
        workOnBibApiElement(1, biblTexts, jsonResponse.data.elements);
        return { status: 'ok', biblTexts: biblTexts };
      } else {
        /*
        or 
        {
        "status": 1,
        "message": "message ; on 2021-04-23T22:02:46.242Z",
        }
  
        or
  
        {
        "status": 2,
        "message": "caught error in response ; on 2021-04-23T22:02:46.242Z",
        "error": "TypeError: Cannot read property 'replace' of undefined"
        }
        */
      }
      const messagestring = "Status: " + jsonResponse.status + ". Message: " + jsonResponse.message + ". Error: " + jsonResponse.error;
      return { status: 'error', message: 'Failed to retrieve data from Zotero. ' + messagestring + ". Please let your admins know about this error." };
    } else {
      return { status: 'error', message: 'Call to forestAPI failed. Response Code = ' + code + '. Please let your admins know about this error.' };
    }
  }
  catch (error) {
    return { status: 'error', message: 'Error in function forestAPIcall. Error: ' + error };
  }
}

function workOnBibApiElement(level, biblTexts, elements, name, link) {

  if (level == 3) {
    biblTexts.push({ text: '\n' });
  }

  elements.forEach(item => {
    if (item.type == 'element') {
      if (!item.attributes) {
        item.attributes = '-';
      } else {
        if (!item.attributes.href) {
          item.attributes = '-';
        }
      }
      workOnBibApiElement(level + 1, biblTexts, item.elements, item.name, item.attributes.href)
    } else {
      //Logger.log(item);
      biblTexts.push({ level: level, text: item.text, name: name, link: link });
    }
  });
}
