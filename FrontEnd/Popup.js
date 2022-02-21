/**
 * Popup to display text. The user is able to close it from the close button
 * or by clicking everywhere else.
 * @type {HTMLElement}
 * @author Theo Nguyen
 */
// Get the modal
var modal = document.getElementById("testPopup");


// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];


// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}


/**
 * function to toogle the visibility of the test popup. If the popup is closed, it is open  else, it is closed.
 */
//---DIPLAY/HIDE THE TEST POPUP
function toggle_visibility_test_popup() {

  //get the popup from the html
  var testPopup = document.getElementById("testPopup");

  if(testPopup.style.display == "block"){
    testPopup.style.display = "none";
  } else {
    testPopup.style.display = "block";
  }
}