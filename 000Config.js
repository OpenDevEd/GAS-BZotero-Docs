const permittedLibraries = [
  {
    Domain: "edtechhub.org",
    Permitted: ["2405685", "2339240", "2129771"]
  },
  {
    Domain: "opendeved.net",
    Permitted: ["2129771", "2405685", "2486141", "2447227"]
  },
];

const ORPHANED_LINK_MARK = '<ORPHANED_LINK>';
const URL_CHANGED_LINK_MARK = '<URL_CHANGED_LINK>';
const BROKEN_LINK_MARK = '<BROKEN_LINK>';
const UNKNOWN_LIBRARY_MARK = '<UNKNOWN_LIBRARY>';

const textToDetectStartBib = '⁅bibliography:start⁆';
const textToDetectEndBib = '⁅bibliography:end⁆';

let LINK_MARK_STYLE_NEW = new Object();
LINK_MARK_STYLE_NEW[DocumentApp.Attribute.FOREGROUND_COLOR] = '#ff0000';
LINK_MARK_STYLE_NEW[DocumentApp.Attribute.BACKGROUND_COLOR] = '#ffffff';
LINK_MARK_STYLE_NEW[DocumentApp.Attribute.BOLD] = true;

const autoPromptCollection = false;