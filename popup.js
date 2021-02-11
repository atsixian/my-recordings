function closedCaption(event) {
    //retrieve CC settings

    //save CC settings

    //lock CC settings

    //show a feedback -- success or failure
    //   let savedButton = document.getElementById('save');
    //   savedButton.innerText = "&#x2705; Saved!";
    //   console.log("saved CC");
}

function clear() {
    //clear all saved data in storage
    //show a feedback -- success or failure
}

//An Alarm delay of less than the minimum 1 minute will fire
// in approximately 1 minute incriments if released
document.getElementById('save').addEventListener('save', closedCaption);
document.getElementById('clear').addEventListener('clear', clear);
