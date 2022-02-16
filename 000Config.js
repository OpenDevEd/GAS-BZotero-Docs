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

const LINK_MARK_STYLE = {
                foregroundColor: {
                  color: {
                    rgbColor: {
                      red: 1.0
                    }
                  }
                },
                backgroundColor: {
                  color: {
                    rgbColor: {
                      red: 1.0,
                      blue: 1.0,
                      green: 1.0
                    }
                  }
                },
                bold: true
              };
const LINK_MARK_FIELDS = 'foregroundColor, backgroundColor, bold';

const autoPromptCollection = false;