const localize = require('../base/localize').localize;

const Validation = (function() {
    'use strict';

    const forms = {};
    const error_class  = 'error-msg';
    const hidden_class = 'invisible';

    const events_map = {
        input   : 'input change',
        select  : 'change',
        checkbox: 'change',
    };

    const getFieldType = $field => (
        $field.length ? ($field.attr('type') === 'checkbox' ? 'checkbox' : $field.get(0).localName) : null
    );

    const getFieldValue = field => (field.type === 'checkbox' ? (field.$.is(':checked') ? '1' : '') : field.$.val()) || '';

    const initForm = (form_selector, fields) => {
        const $form = $(`${form_selector}:visible`);
        if ($form.length) {
            forms[form_selector] = { $form: $form };
            if (Array.isArray(fields) && fields.length) {
                forms[form_selector].fields = fields;

                fields.forEach((field) => {
                    field.$ = $form.find(field.selector);
                    if (!field.$.length || !field.validations) return;

                    field.type = getFieldType(field.$);
                    field.form = form_selector;
                    if (field.msg_element) {
                        field.$error = $form.find(field.msg_element);
                    } else {
                        const $parent = field.$.parent();
                        if ($parent.find(`div.${error_class}`).length === 0) {
                            $parent.append($('<div/>', { class: `${error_class} ${hidden_class}` }));
                        }
                        field.$error = $parent.find(`.${error_class}`);
                    }

                    const event = events_map[field.type];
                    if (event) {
                        field.$.unbind(event).on(event, () => {
                            checkField(field);
                        });
                    }
                });
            }
        }
    };

    // ------------------------------
    // ----- Validation Methods -----
    // ------------------------------
    const validRequired = (value, options, field) => {
        if ((typeof value === 'string' ? value.trim() : value).length) return true;
        // else
        validators_map.req.message = field.type === 'checkbox' ? 'Please select the checkbox.' : 'This field is required.';
        return false;
    };
    const validEmail        = value => /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/.test(value);
    const validPassword     = value => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]+/.test(value);
    const validLetterSymbol = value => !/[`~!@#$%^&*)(_=+\[}{\]\\\/";:\?><,|\d]+/.test(value);
    const validGeneral      = value => !/[`~!@#$%^&*)(_=+\[}{\]\\\/";:\?><|]+/.test(value);
    const validAddress      = value => !/[`~!#$%^&*)(_=+\[}{\]\\";:\?><|]+/.test(value);
    const validPostCode     = value => /^[a-zA-Z\d-\s]*$/.test(value);
    const validPhone        = value => /^\+?[0-9\s]*$/.test(value);
    const validRegular      = (value, options) => options.regex.test(value);
    const validEmailToken   = value => value.trim().length === 48;

    const validCompare  = (value, options) => value === $(options.to).val();
    const validNotEqual = (value, options) => value !== $(options.to).val();
    const validMin      = (value, options) => (options.min ? value.trim().length >= options.min : true);
    const validLength   = (value, options) => (
        (options.min ? value.trim().length >= options.min : true) &&
        (options.max ? value.trim().length <= options.max : true)
    );

    const validNumber = (value, options) => {
        let is_ok = true,
            message = '';

        if (!(options.type === 'float' ? /^\d+(\.\d+)?$/ : /^\d+$/).test(value) || !$.isNumeric(value)) {
            is_ok = false;
            message = localize('Should be a valid number');
        } else if (options.type === 'float' && options.decimals &&
            !(new RegExp('^\\d+(\\.\\d{' + options.decimals.replace(/ /g, '') + '})?$').test(value))) {
            is_ok = false;
            message = localize('Only [_1] decimal points are allowed.', [options.decimals]);
        } else if (options.min && +value < +options.min) {
            is_ok = false;
            message = localize('Should be more than [_1]', [options.min]);
        } else if (options.max && +value > +options.max) {
            is_ok = false;
            message = localize('Should be less than [_1]', [options.max]);
        }

        validators_map.number.message = message;
        return is_ok;
    };

    const validators_map = {
        req          : { func: validRequired,     message: '' },
        email        : { func: validEmail,        message: 'Invalid email address' },
        password     : { func: validPassword,     message: 'Password should have lower and uppercase letters with numbers.' },
        general      : { func: validGeneral,      message: 'Only letters, numbers, space, hyphen, period, and apostrophe are allowed.' },
        address      : { func: validAddress,      message: 'Only letters, numbers, space, hyphen, period, and apostrophe are allowed.' },
        letter_symbol: { func: validLetterSymbol, message: 'Only letters, space, hyphen, period, and apostrophe are allowed.' },
        postcode     : { func: validPostCode,     message: 'Only letters, numbers, space, and hyphen are allowed.' },
        phone        : { func: validPhone,        message: 'Only numbers and spaces are allowed.' },
        email_token  : { func: validEmailToken,   message: 'Please submit a valid verification token.' },
        compare      : { func: validCompare,      message: 'The two passwords that you entered do not match.' },
        not_equal    : { func: validNotEqual,     message: '[_1] and [_2] cannot be the same.' },
        min          : { func: validMin,          message: 'Minimum of [_1] characters required.' },
        length       : { func: validLength,       message: 'You should enter [_1] characters.' },
        number       : { func: validNumber,       message: '' },
        regular      : { func: validRegular,      message: '' },
    };

    const pass_length = { min: 6, max: 25 };

    // --------------------
    // ----- Validate -----
    // --------------------
    const checkField = (field) => {
        if (!field.$.is(':visible') || !field.validations) return true;
        let all_is_ok = true,
            message;

        field.validations.some((valid) => {
            let type,
                options = {};

            if (typeof valid === 'string') {
                type = valid;
            } else {
                type    = valid[0];
                options = valid[1];
            }

            if (type === 'password' && !validLength(getFieldValue(field), pass_length)) {
                field.is_ok = false;
                type = 'length';
                options = pass_length;
            } else {
                const validator = validators_map[type].func;
                field.is_ok = validator(getFieldValue(field), options, field);
            }

            if (!field.is_ok) {
                message = options.message || validators_map[type].message;
                if (type === 'length') {
                    message = localize(message, [options.min === options.max ? options.min : `${options.min}-${options.max}`]);
                } else if (type === 'min') {
                    message = localize(message, [options.min]);
                } else if (type === 'not_equal') {
                    message = localize(message, [localize(options.name1), localize(options.name2)]);
                }
                all_is_ok = false;
                return true;
            }
            return false;
        });

        if (!all_is_ok) {
            showError(field, message);
        } else {
            clearError(field);
        }

        return all_is_ok;
    };

    const clearError = (field) => {
        if (field.$error && field.$error.length) {
            field.$error.addClass(hidden_class);
        }
    };

    const showError = (field, message) => {
        clearError(field);
        field.$error.text(localize(message)).removeClass(hidden_class);
    };

    const validate = (form_selector) => {
        const form = forms[form_selector];
        if (!form.fields) return true;
        form.is_ok = true;
        form.fields.forEach((field) => {
            if (!checkField(field)) {
                if (form.is_ok && !field.no_scroll) { // first error
                    $.scrollTo(field.$, 500, { offset: -10 });
                }
                form.is_ok = false;
            }
        });
        return form.is_ok;
    };

    return {
        init    : initForm,
        validate: validate,
    };
})();

module.exports = Validation;
