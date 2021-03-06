function onlyNumericOnKeypress(ev, optional_value) {
    const key = ev.keyCode;
    const char = String.fromCharCode(ev.which);
    let array_of_char = [8, 37, 39, 46]; // delete, backspace, arrow keys
    if (optional_value && optional_value.length > 0) {
        array_of_char = array_of_char.concat(optional_value);
    }
    if (
        (char === '.' && ev.target.value.indexOf(char) >= 0) ||
        (!/[0-9\.]/.test(char) && array_of_char.indexOf(key) < 0) ||
        /['%]/.test(char)) { // similarity to arrows key code in some browsers
        ev.returnValue = false;
        ev.preventDefault();
    }
}

module.exports = {
    onlyNumericOnKeypress: onlyNumericOnKeypress,
};
