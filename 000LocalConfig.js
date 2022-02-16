// This is not needed:
const local_default_validation_site = "https://docs.opendeved.net/lib/";
// because the default site should come from the logged-in user. 
// If user = @edtechhub.org => https://docs.edtechhub.org/lib/
// If user = @opendeved.net => https://docs.opendeved.net/lib/
// otherwise: script asks.

// If user = @opendeved.net: local_show_advanced_menu = true;
// otherweise:  local_show_advanced_menu = false;
const local_show_advanced_menu = true;