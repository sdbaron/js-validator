var MC = MC || {};
MC.Common || (MC.Common={});
/**
 * @namespace MC.Common.Validator
 */
MC.Common.Validator = {
    /**
     * Правило валидации
     * @param {Function} isValidCheckerFn - функция, выполняющая проверку валидации
     * @param {Boolean} [shouldCheckImmediately=false] - если true, выполнять проверку при возникновении
     *   событий-триггеров, даже если кнопка сабмита еще не была нажата. По умолчанию проверка выполнятеся
     *   только после нажатия кнопки сабмита
     * @returns {{doCheck: Function, getErrorText: Function}} -
     * @constructor
     */
    Checker: function (isValidCheckerFn, shouldCheckImmediately) {
        shouldCheckImmediately = shouldCheckImmediately === true;
        var
            lastErrorText = null,
            _isValid = null;


        function _getLastErrorText() {
            return lastErrorText;
        }

        function _setLastErrorText(text) {
            return lastErrorText = text;
        }

        return {
            // метод выполняющий проверку
            doCheck: isValidCheckerFn,
            // восзвращает текст ошибки
            getErrorText: function () {
                return null;
            },

            //выдаёт текст ошибки после последней проверки
            getLastErrorText: _getLastErrorText,
            // устанвливает текст ошибки от последней проверки
            setLastErrorText: _setLastErrorText,
            // устанавливает состояние валидности после проверки
            setValidness: function (value) {
                _isValid = value;
            },
            // возвращает true, если последняя проверка была успешной
            isValid: function () {
                return _isValid;
            },

            shouldCheckImmediately: shouldCheckImmediately

        };
    }
};

    /**
     * JsonChecker - правило валидации, которое вызывает асинхронный запрос к серверу
     * @param {Function} jsonValidateFn
     * @param {Boolean} [shouldCheckImmediately=true]
     * @param {Function|null} [onAfterCheck=null]
     * @return {{doCheck: Function, getErrorText: Function, isValid: Function}}
     * @constructor
     */
MC.Common.Validator.JsonChecker = function (jsonValidateFn, shouldCheckImmediately, onAfterCheck) {
        shouldCheckImmediately = !(shouldCheckImmediately === false);
        onAfterCheck || (onAfterCheck = function(){});
        var
            result = null,
            prevItemValue = null,
            text = null,
            checkerItem = null;

        function success(){
            result = true;
//            console.log('JsonChecker success errorText');
            _updateValidator();
            onAfterCheck(result);
        }

        function fail(errorText){
            text = (errorText)? errorText: null;
            result = false;
//            console.log('JsonChecker fail errorText=' + errorText);
            _updateValidator();
            onAfterCheck(result, text);
        }

        function isValidCheckerFn($item){
            // пустые значения не отправляем на асинхронную проверку
            if (!$item.val()) return true;

            if (MC.Common.notEqual(prevItemValue, $item.val()) || result == null) {
//                console.log('isValidCheckerFn prevItemValue=' + prevItemValue + ' $item.val()=' + $item.val());
                prevItemValue = $item.val();
                jsonValidateFn($item, success, fail);
            }
//            console.log('isValidCheckerFn() return result=' + result );
            return result;
        }

        function _getErrorText(){
            return text;
        }

//        function _doCheck($item){
//            return isValidCheckerFn($item);
//        }

        var _validator = null;
        function _getValidator(){
            if (_validator) return _validator;
            if (_validator === false) return null;
            if (checkerItem && checkerItem.getValidator){
                _validator = checkerItem.getValidator();
            } else {
                _validator = false;
            }

            return _validator;

        }

        var _checker = null;
        function _getChecker(){
            if (_checker) return _checker;
            if (_checker === false) return null;
            if (!checkerItem || !checkerItem.getChecker){
                _checker = false;
            } else{
                _checker = checkerItem.getChecker();
            }
            return _checker;

        }

        function _updateValidator(){
            var validator = _getValidator(),
                checker = _getChecker();
            if (validator) {
                validator.isSubmitEnable(checker);
            }
        }

        var facade = new MC.Common.Validator.Checker(isValidCheckerFn, shouldCheckImmediately);

        facade['getErrorText'] = _getErrorText;
        facade['setOwnerCheckerItem'] = function setOwnerCheckerItem(item){
                checkerItem = item;
            };
        facade['getChecker'] = _getChecker;
        facade['updateValidator'] = _updateValidator;

        return facade;

//        return {
//            doCheck: _doCheck,
//            getErrorText: _getErrorText,
//            shouldCheckImmediately: true,
//            setOwnerCheckerItem: function setOwnerCheckerItem(item){
//                checkerItem = item;
//            },
//            getChecker: _getChecker,
//            updateValidator: _updateValidator
//
//        };

    };

    /**
     * Объект, содержащий всю информацию для валидации. В явном виде создается для сложных правил -
     * - для асинхронных запросов и запросов возвращающих свои сообщения об ошибках,
     * в остальных случаях удобнее пользоваться SimpleItem
     * @param {Object} $item - то валидируется
     * @param {{doCheck: Function, getErrorText: Function}} checker - объект-чекер, который содержит функцию-черкер doCheck
     * @param {Object} [renderOptions] - объект содержащий вспомогательные функции для отображения ошибок
     *  {String|null} renderOptions.[errorText=null] - текст ошибки, который выводится рядом с элементом
     *  {String|null} renderOptions.[listErrorText=errorText] - текст ошибки, который выводится в общий список
     *
     *  {Function|null} renderOptions.[showError] - если эта функция определена,
     *  то она будет использоваться для отображения ошибки, вместо такой же фунции, определенной для валидатора
     *  {Function|null} renderOptions.[getItemErrorLine] - есди эта фунция определена, то она будет использоваться для
     *      поиска контейнера отображения ошибки, вместо такой же фунции, определенной для валидатора
     *  {Function|null} options.[markElementAsInvalid=null] - если эта фунция определена, то она будет использоваться для
     *      того, чтобы отметить элемент ввода как невалидный (обычно элементу добавляется класс "invalid")
     *  {string[]|null} renderOptions.[bindEvents=null] - список событий по которым должна вызываться
     *      проверка элемента ввода. если первый элемент массива равен 'all', тогда считаем,
     *      что передан список событий ['keyup', 'focus', 'blur', 'change']
     * @constructor
     */
MC.Common.Validator.Item = function ($item, checker, renderOptions) {
        var self = this;

        this.$item = $item;
        this.checker = checker;
        this.validator = null;

        if (this.checker.setOwnerCheckerItem) {
            this.checker.setOwnerCheckerItem(this);
        }

        renderOptions = renderOptions || {};

        this.fieldErrorText = renderOptions.errorText;
        this.listErrorText = renderOptions.listErrorText || this.fieldErrorText;

        var getItemErrorLineExists = !!(renderOptions && renderOptions.getItemErrorLine),
            showErrorExists = !!(renderOptions && renderOptions.showError),
            markElementAsInvalidExists = !!(renderOptions && renderOptions.markElementAsInvalid),
            markElementAsValidExists = !!(renderOptions && renderOptions.markElementAsValid),
            bindEvents = renderOptions.bindEvents || [];


        this.getItemErrorLine = getItemErrorLineExists === false ? null : function(){
                return renderOptions.getItemErrorLine(self.$item);
            };
        this.showError = showErrorExists === false ? null : function($errorLine){
                return renderOptions.showError(self, $errorLine);
            };
        this.markElementAsInvalid = markElementAsInvalidExists === false ? null : function(){
                return renderOptions.markElementAsInvalid($item);
            };
        this.markElementAsValid = markElementAsInvalidExists === false ? null : function(){
                return renderOptions.markElementAsValid($item);
            };

        this.setValidator = function(validatorInstance){
            this.validator = validatorInstance;
            if (!this.markElementAsValid){
                this.markElementAsValid = function(){
                    this.validator.markElementAsValid(self.$item, self);
                }
            }
        };

        this.getValidator = function(){
            return self.validator;
        };

        this.getChecker = function(){
            return self.checker;
        };

        this.updateValidator = function(){
            if (self.validator){
                self.validator.isSubmitEnable(checker);
            }
        };

        if ( bindEvents.length > 0){
            if (bindEvents[0] === 'all'){
                MC.Common.Validator.Helper.addAllEventsHandler(self.$item, self.updateValidator);
            } else {
                MC.Common.Validator.Helper.addHandler(self.$item, self.updateValidator, bindEvents);
            }
        }

    };

    /**
     * Упрощенный конструктор объекта с информацией для валидации
     * @param {Object} $item - валидируемый элемент
     * @param {Function} isValidCheckerFn - function for validation
     * @param {Object} [renderOptions] - объект содержащий вспомогательные функции для отображения ошибок
     *  {String|null} renderOptions.[errorText=null] - текст ошибки, который выводится рядом с элементом
     *  {String|null} renderOptions.[listErrorText=errorText] - текст ошибки, который выводится в общий список
     *
     *  {Function|null} renderOptions.[showError] - если эта функция определена,
     *      то она будет использоваться для отображения ошибки, вместо такой же фунции, определенной для валидатора
     *  {Function|null} renderOptions.[getItemErrorLine] - если эта фунция определена, то она будет использоваться для
     *      поиска контейнера отображения ошибки, вместо такой же фунции, определенной для валидатора
     *  {Function|null} options.[markElementAsInvalid=null] - если эта фунция определена, то она будет использоваться
     *      для того, чтобы отметить элемент ввода как невалидный (обычно элементу добавляется класс "invalid")
     *  {string[]|null} renderOptions.[bindEvents=null] - список событий по которым должна вызываться
     *  проверка элемента ввода. если первый элемент массива равен 'all', тогда считаем,
     *      что передан список событий ['keyup', 'focus', 'blur', 'change']
     * @constructor
     */
MC.Common.Validator.SimpleItem = function ($item, isValidCheckerFn, renderOptions) {
        return new MC.Common.Validator.Item($item,
            new MC.Common.Validator.Checker(isValidCheckerFn), renderOptions);
    };

MC.Common.Validator.ItemNotWaitSubmit = function ($item, isValidCheckerFn, renderOptions) {
        return new MC.Common.Validator.Item($item,
            new MC.Common.Validator.Checker(isValidCheckerFn, true), renderOptions);
    };

    /** простые клиентские проверки */
MC.Common.Validator.Rules = {
        required: function ($item) {
            return $item.val() != '' && $item.val() != null;
        },
        isNumericPositive: function ($item) {
            return $.isNumeric($item.val()) && $item.val() > 0;
        },
        isRealNumber: function ($item) {
            return $.isNumeric($item.val()) && $item.val() >= 0;
        },
        isNumeric: function ($item) {
            return $.isNumeric($item.val());
        },
        checked: function ($item) {
            return $item.is(':checked');
        },
        toMachCaps: function($item){
            return checkCapslock($item.val(), 50);

            function checkCapslock(inp, percent) {
                percent = percent || 50;
                var
                    capitalized = 0,
                    words = inp.trim().split(' '),
                    word, i, len = words.length;

                for (i = len; --i >= 0;) {
                    if (_wordIsUpper(words[i])) capitalized++;
                }

                return !(capitalized > 0 && (capitalized * 100 / len) > percent);

                function _wordIsUpper(word) {
                    var
                        re = /(?:[A-ZА-Я0-9]*[^A-Za-zА-Яа-я0-9]*)+/,
                        m = re.exec(word);
                    if (!m || m.length === 0 || m[0].length !== word.length) return false;
                    // проверим, что в слове содержатся заглавные буквы, а не только цифры и символы подчеркивания
                    return /[A-ZА-Я]/.test(m[0]);
                }
            }

        }
    };

    /** сложные асинхронные проверки */
MC.Common.Validator.ItemRules = {
        /**
         *
         * @param $item
         * @returns {{doCheck: Function, getErrorText: Function}}
         */
        Spam: (function($item){
            var errorText;
            function _check($item){
                var spam = MC.Verify.checkSpamWords($item.val());
                if (spam) errorText = _('Not allowed to use') + ' ' + spam;
                return spam === null;
            }

            var facade = new MC.Common.Validator.Checker(_check, true);
            facade['getErrorText'] =  function(){ return errorText;};
            return facade;
        })()

    };

    /**
     * Демонстратор списка ошибок
     * @param options
     * {Object} options.[$dialog] - jQuery-объект контейнера формы
     * {String} options.[errorLine='.hint_line'] - элемент-контейнер, которому будет добавлен класс error,
     * в случае возникновения ошибки в поле ввода
     * {String} [options.errorListClass='errorList hinter error'] - css-class, который назначается элементу UL списика ошибок
     * {Boolean|null} [options.setFocusInFirstInvalid=false] - устанавливать ли фокус в первый ошибочный элемент ввода
     * {Function|null} [options.getItemErrorLine=null]
     * {Function|null} [options.getFomErrorsBlock=null]
     * {Function|null} [options.getFormErrorLines=null]
     * {Function|null} [options.getFormErrorLinesUl=null]
     * {Function} [options.showErrorsList=null]
     * {Function|null} [options.showElementError=null]
     * {Function} [options.hideErrorsList=null]
     * {Function|null} [options.markElementAsInvalid=null]
     * {Function[]|null} [options.onErrorsExistsHandlers=null]
     * {Function[]|null} [options.onErrorsHiddenHandlers=null]
     * @returns {{showErrorsList: Function,
     * hideErrorsList: Function,
     * markElementAsValid: Function,
     * setValidator: Function,
     * clear: Function }}
     * @constructor
    */
MC.Common.Validator.ValidatorLayoutNavigator = function(options){
        var $dialog = options.$dialog,
            validator = options.validator,
            errorListClass = options.errorListClass || 'errorList hinter error',
            setFocusInFirstInvalid = options.setFocusInFirstInvalid,
            errorLine = options.errorLine,
            getFormErrorsBlock = options.getFomErrorsBlock || _getFomErrorsBlock,
            getItemErrorLine = options.getItemErrorLine || _getItemErrorLine,
            getFormErrorLines = options.getFormErrorLines || _getFormErrorLines,
            getFormErrorLinesUl = options.getFormErrorLinesUl || _getFormErrorLinesUl,
            showElementError = options.showElementError || _showElementError,
            showErrorsList = options.showErrorsList || _showErrorsList,
            hideErrorsList = options.hideErrorsList || _hideErrorsList,
            markElementAsInvalid = options.markElementAsInvalid || _markElementAsInvalid,
            markElementAsValid = options.markElementAsValid || _markElementAsValid,
            onErrorsExistsHandlers = options.onErrorsExistsHandlers || [function(){}],
            onErrorsHiddenHandlers = options.onErrorsHiddenHandlers || [function(){}];


        /**
         * Показывает ошибки на основании массива объектов ошибок errorsItemsList
         * @param {Object[]} errorsIdList - список объктоа ошибок
         */
        function _showErrorsList( errorsIdList){
            var
                i, ind, len, length, focusFirstInvalid;
//            if (focusFirstInvalidParam !== true && focusFirstInvalidParam !== false){
//                focusFirstInvalid = setFocusInFirstInvalid === true;
//            }
//            focusFirstInvalid = !(focusFirstInvalidParam === false);


            var $formErrorBlocks = getFormErrorsBlock(),
                $formErrorsUl = $formErrorBlocks.find('ul');
            for ( i = 0, len = errorsIdList.length; i < len; i++) {
                var ei = errorsIdList[i];
                if (!ei) continue;
                /* Заполняем общий список ошибок, который обычно внизу формы */
                if ($formErrorsUl.length > 0) {
                    var listError = ei.listErrorText;
                    var $li = $formErrorsUl.children("li :contains('" + listError + "')");
                    if ($li.length > 0) {
                        $li.show();
                    } else if (listError && listError > 0) {
                       $formErrorsUl.append('<li>' + listError + '</li>');
                    }
                }

                if (ei.$item) {
                    var $element = ei.$item;
                    if ($element.length > 0) {
                        if ($element.is && $element.is('select')) {
                            var $wrapper = $element.parent('div.ik_select');
                            if ($wrapper.length > 0)
                                $element = $wrapper;
                        }
                        /* если у объекта ошибки есть функция поиска контейнера для ошибки,то пользуемся ей,
                         если нет, то берем общую функцию для этого валидатора */
                        var
                            $line = ei.getItemErrorLine? ei.getItemErrorLine(): getItemErrorLine($element) ;
                        /* если у объекта ошибки есть функция отображения, то пользуемся ей,
                         если нет, то берем общую функцию для этого валидатора */
                        // и отображаем ошибку для элемента ввода
                        if (ei.showError) {
                            ei.showError($line);
                        } else {
                            showElementError(ei, $line);
                        }

                        // помечаем элемент ввода классом invalid
                        if (ei.markElementAsInvalid) {
                            ei.markElementAsInvalid($element);
                        } else {
                            markElementAsInvalid($element);
                        }

                    }
                }
            }

            if (len > 0 ) {
                for (i = onErrorsExistsHandlers.length; --i >= 0;) {
                    onErrorsExistsHandlers[i]();
                }
            }

            return errorsIdList;

        }

        /**
         * @method _hideErrorsList - прячет все ошибки для элементов ввода и общий блок ошибок в форме
         * @private
         */
        function _hideErrorsList() {
            var i;
            // прячем общий блок ошибок
            getFormErrorsBlock().hide();
            if (validator) {
                for (i = validator.validateItems.length; --i >=0;){
                    var validateItem = validator.validateItems[i];
                        // помечаем элемента ввода как валидный
                        if (validateItem.markElementAsValid) {
                            validateItem.markElementAsValid(validateItem.$item);
                        } else {
                            markElementAsValid(validateItem.$item, validateItem);
                        }
                }
            }
//            // убираем класс invalid для всех эелементов ввода данных
//            $dialog.find('.invalid').removeClass('invalid');
            // убираем ошибки у всех контейнеров элементов ввода
            getFormErrorLines().removeClass('error').find('ul.errorList').hide();
            /* вызовем все обработчики повешенные на событие сокрытия ошибок на форме */
            for(i = onErrorsHiddenHandlers.length; --i >= 0; ){
                onErrorsHiddenHandlers[i]();
            }
        }

        function _markElementAsInvalid($element) {
            $element.addClass('invalid');
        }

        function _markElementAsValid($element, validateItem) {
            $element.removeClass('invalid');
            var
                $errorLine = validateItem.getItemErrorLine ?
                    validateItem.getItemErrorLine() : getItemErrorLine(validateItem.$item);

            $errorLine.find('.invalid').removeClass('invalid');
            if (validateItem.$item.removeClass){ validateItem.$item.removeClass('invalid'); }
            $errorLine.removeClass('error').find('ul.errorList').hide();
        }

        /**
         * @method _showElementError - показывает ошибку для конкретного errorItem
         * @param {Object} errorItem - полная информация для отображения ошибки
         * @param {Object} $errorLine - jquery-элемент документа, контейнер, внутри которого лежат элементы
         * отображающие ошибки и, скорее всего, сам проверяемый элемент ввода
         * @private
         */
        function _showElementError(errorItem, $errorLine){
            if ($errorLine.length > 0) {
                var
                    $cite = $errorLine.children('cite'),
                    s = '',
                    errText = errorItem.fieldErrorText;

                $errorLine.addClass('error');

                if ($cite.length > 0) {
                    $cite.empty();
                }

                if ( errText && errText.length > 0 ) {
                    s += '<li>' + errText + '</li>';
                }
                if (s.length > 0) {
                    var $ul = '<ul class="' + errorListClass + '">' + s + '</ul>';
                    if ($cite.length == 0) {
                        $errorLine.append('<cite></cite>');
                        $cite = $errorLine.children('cite');
                    }
                    $cite.append($ul);
                    $cite.show();
                }
            }

        }

        /**
         * Возвращает блок с общим списком ошибок, обычно расположенный внизу формы
         * @returns {*}
         */
        function _getFomErrorsBlock(){
            return $dialog.find('div.form-errors');
        }

        /**
         * Возвращает контейнер для элемента ввода. Этому контейнеру добавляется класс error, в случае ошибки в $errorElement
         * @param $errorElement - элемент ввода, для которого ищется контейнер
         * @returns {*}
         */
        function _getItemErrorLine( $errorElement ){
            return $errorElement.parents(errorLine);
        }

        /**
         * Возвращает все контейнеры для элементов ввода. Этим контейнерам добавляется класс error
         * в случае ошибки в элементе ввода
         * @returns {*}
         */
        function _getFormErrorLines(){
            return $dialog.find('.hint_line');
        }

        /**
         * Возвращает элементы UL в контейнерах для элементов ввода
         * @returns {*}
         */
        function _getFormErrorLinesUl(){
            return _getFormErrorLines.find('ul');
        }

        function clear(){
            hideErrorsList();
        }

        function setValidator(validatorInstance){
            validator = validatorInstance;
        }

        return {
            showErrorsList: showErrorsList,
            hideErrorsList: hideErrorsList,
            markElementAsValid: markElementAsValid,
            setValidator: setValidator,
            clear: clear
        };
    };

    /**
     * Конструктор валидатора формы
     * @param {Object[]} validateItems - список объектов, описывающих проверки
     * @param {Object} config - парметры выдидатора
     * {Boolean}        config.[returnExistsValidator=false] - если true, тогда не создает новый валидатор,
     *                      а возвращает уже существующий для кнопки
     * {String}         config.[dialogSelector] - selector для контейнера формы
     * {Object}         config.[$dialog] - jQuery-объект контейнера формы
     * {String}         config.[errorLine='div-line'] - элемент-контейнер, которому будет добавлен класс error,
     *                          в случае возникновения ошибки в поле ввода
     * {String}         config.errorListClass - css-class, который назначается элементу UL списках ошибок
     * {Function|null}       config.[onErrorsExists=null] - обработчик, вызываемый в случае возникновения ошибок
     * {Function|null}       config.[onErrorsHidden=null] - обработчик, вызываемый в случае, когда ошибки исправлены
     *                      и список ошибок прячется,
     * {Boolean}        config.[focusOnInvalidElement=true] - Признак того, что при возникновении ошибок,
     *                      фокус нужно установить в первое невалидное поле
     * {Boolean}        config.[moveOnInvalidElement=true] - при возникновении ошибки нужно прокрутить документ к невалидному полю
     * {Object|null}         config.[$buttonSubmit=null] - конопка сабмита
     * {Function|null}  config.[onSubmitButtonHandler=null] - действия выполняемые по нажатию кнопки
     * {MC.Common.Validator.ValidatorSubmitBehavior|null} config.[submitBehavior=null] - объект, определяющий, кода вызывается валидация
     * {MC.Common.Validator.ValidatorLayoutNavigator|null} config.[layoutNavigator=null] - объект, заведующий отображением ошибок
     * @constructor
     *          <div class="div-line hint_line form_line error"> <--errorLine
     *  			<input class="invalid">
     *  			<cite>
     *  			    <ul class="errorList hinter error">  <-- errorListClass
     *  			        <li>Сообщени об ошибке в поле ввода</li>
     *  			    </ul>
     *  			</cite>
     *          </div>
     */
MC.Common.Validator.ValidatorForm = function (validateItems, config ) {

        if(!config.dialogSelector && !config.$dialog && !config.layoutNavigator){
            throw 'no dialogSelector neither $dialog neither layoutNavigator not found in config';
        }
        var $buttonSubmit = config.$buttonSubmit;

        var _validatorWasCreatedInThePreviousTime = false;
        this.validatorWasCreatedInThePreviousTime = function(){
            return _validatorWasCreatedInThePreviousTime;
        };
        if (config.returnExistsValidator === true && $buttonSubmit && $buttonSubmit.length > 0){
            var existsValidator = MC.Common.Validator.ValidatorSubmitBehavior.getExistsValidator($buttonSubmit.get(0));
            if (existsValidator) {
                _validatorWasCreatedInThePreviousTime = true;
                return existsValidator;
            }
        }
        var moveOnInvalidElement = !(config.moveOnInvalidElement === false);
        this.errorsItemsList = [];
        this.setValidateItems(validateItems);

        // сохраним в каждом элементе валидации ссылку на валидатор
        if (this.validateItems) {
            this.setValidatorForCheckedItems(this.validateItems);
        }

        this.was_invalid_checked = false;

        var onErrorsExistsHandlers = [];
        var onErrorsHiddenHandlers = [];

        if (config['onErrorsExists']) {
            onErrorsExistsHandlers.push(config['onErrorsExists']);
        }
        if(config.onErrorsHidden) {
            onErrorsHiddenHandlers.push(config.onErrorsHidden);
        }

        var
            self = this,
            layoutNavigator = config.layoutNavigator;
        if (layoutNavigator) {
            layoutNavigator.setValidator(self);
        } else {
            var $dialog = this.$dialog = config.dialogSelector ? $(config.dialogSelector) : config.$dialog;
            layoutNavigator = new MC.Common.Validator.ValidatorLayoutNavigator({
                $dialog: self.$dialog,
                validator: self,
                errorLine: config.errorLine,
                errorListClass: config.errorListClass,
                getFomErrorsBlock: function getFomErrorsBlock() {
                    return $dialog.find('div.form-errors');
                },
                getFormErrorLines: function () {
                    return $dialog.find('.hint_line,div.form_line');
                },
                getItemErrorLine: function ($inputElement) {
                    return $inputElement.closest(config.errorLine || '.hint_line,div.form_line').first();
                },
                getFormErrorLinesUl: function _getFormErrorLinesUl() {
                    return $dialog.find('.hint_line,div.form_line').find('ul');
                },
                onErrorsExistsHandlers: onErrorsExistsHandlers,
                onErrorsHiddenHandlers: onErrorsHiddenHandlers
            });
        }

        var submitBehavior = config.submitBehavior;
        if((!config.$buttonSubmit || config.$buttonSubmit.length == 0) && !submitBehavior){
            console.warn('Не определены ни $buttonSubmit, ни submitBehavior');
        } else {
            if (!submitBehavior){
                submitBehavior = new MC.Common.Validator.ValidatorSubmitBehavior({
                    validator: self,
                    $buttonSubmit: config.$buttonSubmit,
                    onSubmitButtonHandler: config.onSubmitButtonHandler,
                    focusOnInvalidElement: config.focusOnInvalidElement
                })
            }
        }

        this.isSubmitEnable = submitBehavior && submitBehavior.isSubmitEnable
            ? submitBehavior.isSubmitEnable
            : function () {
                console.warn('function isSubmitEnable is not defined');
                return false;
            };

//        this.isSubmitEnableForAllValidators = submitBehavior && submitBehavior.isSubmitEnableForThisValidatorOnly
//            ? submitBehavior.isSubmitEnableForThisValidatorOnly
//            : function () {
//                console.warn('function isSubmitEnableForThisValidatorOnly is not defined');
//                return false;
//            };

        /**
         * Проверяет валидность полей формы и заносит обнаруженные ошибки в this.errorsItemsList
         * @param {Object|null} [onlyChecker=null] - если определён, тогда валидация вызывается только у него
         * @returns {Boolean|null} - если возвращает null, значит результат неопределён - не выполнились асинхронные проверки
         */
        this.formIsValid = function(onlyChecker){
            var submitButtonTrigger = submitBehavior? submitBehavior.getButtonTrigger(): false;
            return this._formIsValid(onlyChecker, submitButtonTrigger);
        };

        this.shouldMoveOnInvalidElement = function(){
            return moveOnInvalidElement;
        };

        /* внешний прокси-метод, прорисовывающий сообщения об ошибках */
        this.showErrorsList = function(focusOnInvalidElement){
            return layoutNavigator.showErrorsList(self.errorsItemsList);
        };

        /* внешний прокси-метод, скрывающий сообщения об ошибках */
        this.hideErrorsList = function(){
            layoutNavigator.hideErrorsList()
        };


        /* внешний прокси-метод, скрывающий сообщения об ошибках */
        this.markElementAsValid = function($element, validateItem){
            layoutNavigator.markElementAsValid($element, validateItem)
        };

        /* добавление (и удаление) в цепочку обработчиков, вызываемых при возникновении ошибок */
        this.addErrorsExistsHandler = function(handler){
            onErrorsExistsHandlers.push(handler);
        };

        this.removeErrorsExistsHandler = function(handler){
            var index = onErrorsExistsHandlers.indexOf(handler);
            if (index >= 0){
                onErrorsExistsHandlers.splice(index,1);
            }
        };

        /* добавление (и удаление) в цепочку обработчиков, вызываемых при исправлении всех ошибок */
        this.addErrorsHiddenHandler = function(handler){
            onErrorsHiddenHandlers.push(handler);
        };

        this.removeErrorsHiddenHandler = function(handler){
            var index = onErrorsHiddenHandlers.indexOf(handler);
            if (index >= 0){
                onErrorsHiddenHandlers.splice(index,1);
            }
        };

        this.clear = function(){
            // сбросим сотсояние ошибки у всех чекеров
            for (var i = self.validateItems.length; --i >= 0;){
                self.validateItems[i].checker.setValidness(true);
            }
            if (submitBehavior.clear) submitBehavior.clear();
            if (layoutNavigator.clear) layoutNavigator.clear();
        };

        this.rebindSubmit = function(){
            if (submitBehavior.rebindSubmit) submitBehavior.rebindSubmit();
        };

        this.resetButtonTrigger = function(){
           if (submitBehavior.resetButtonTrigger) submitBehavior.resetButtonTrigger();
        }

    };

    /**
     * @class ValidatorSubmitBehavior - Реализует алгоритм поведения кнопки сабмит в форме
     * @param {Object} options - Набор параметров
     * {Object|null} [options.$buttonSubmit=null] - Кнопка сабмита
     * {MC.Common.Validator.ValidatorForm} options.validator - Валидатор
     * {Boolean} options.[focusOnInvalidElement=true] - Признак того, что при возникновении ошибок, фокус нужно установить в первое невалидное поле
     * {Function|null} options.[onButtonHandler=null] - метод который выполняется, если нажате на кнопку разрешено и кнопка нажата
     * {Function|null} options.[onSubmit=null] - метод, котортый вызывается при нажатии на кнопку, отменяет весь алгоритм проверки,
     *      в качестве параметров туда передается событие и валидатор
     * @returns {{isSubmitEnable: Function}} - возвращает функцию, которую нужно вызвать при каждом изменении валидируемых полей
     * @constructor
     */
MC.Common.Validator.ValidatorSubmitBehavior = function (options){
        var $buttonSubmit = options.$buttonSubmit,
            validator = options.validator,
            focusOnInvalidElement = !(options.focusOnInvalidElement === false),
            onSubmitButtonHandler = options.onSubmitButtonHandler || function(){},
            onSubmit = options.onSubmit || _onSubmit,
            allValidatorButtonStates = MC.Common.Validator.ValidatorSubmitBehavior._AllValidatorButtonStates,
            /* флаг-признак того, что на кнопку $buttonSubmit был привязан обработчик */
            submitButtonWasBind = false,
            /* флаг-признак того, что кнопка $buttonSubmit была нажата хотя бы один раз
             когда true, метод isSubmitEnable будет валидировать форму и показывать ошибки
             */
            submitWasClickedTrigger = false;

        _getOrRegisterSubmitButton(validator, $buttonSubmit);

        /**
         * @function isSubmitEnable
         * основная задача - не вызывать валидацию до первой попытки сабмита формы
         */
        function isSubmitEnable(focusOnFirstInvalidElement, checker, onlyValidatorForCheck) {
            return _checkSubmitEnable(validator, $buttonSubmit, focusOnFirstInvalidElement, checker, onlyValidatorForCheck);
        }

        function _onSubmitInside(event){
            submitWasClickedTrigger = true;
            return onSubmit(event, validator)
        }

        /**
         * @method onSubmit - вешается на click кнопки $buttonSubmit
          */
        function _onSubmit(event){
            if (!isSubmitEnable(focusOnInvalidElement, null)){
                event.preventDefault ? event.preventDefault() : (event.returnValue = false);
                moveToAfterShowErrors();
                return false;
            } else if (onSubmitButtonHandler){
                var res = onSubmitButtonHandler();
                return res === true || res === undefined;
            }
            return true;
        }

        function moveToAfterShowErrors(){
            var i, sb, submitInfo = _getCurrentButtonValidatorStates(),
                firstError, errorsList;

            for (i = 0; i < submitInfo.length; i++) {
                sb = submitInfo[i];
                if (sb.validator.shouldMoveOnInvalidElement()){
                    errorsList = sb.getErrorsItemsList();
                    if (errorsList && errorsList.length > 0){
                        var currentFirstError = errorsList[0];
                        if (!firstError || firstError.$item.offset().top > currentFirstError.$item.offset().top){
                            firstError =  currentFirstError;
                        }
                    }
                }
            }
            if (firstError && window['smoothScrollingTo']){
                smoothScrollingTo(firstError.$item, 100);
            }

        }

        /* прикрепим новый обработчик */
        _bindSubmitButton();

        function _bindSubmitButton(){
            if (!submitButtonWasBind) {
                submitButtonWasBind = true;
                $buttonSubmit.on('click', _onSubmitInside);
            }
        }

        function _unbindSubmitButton(){
            if (submitButtonWasBind) {
                submitButtonWasBind = false;
                $buttonSubmit.off('click', _onSubmitInside);
            }
        }

        /**
         * Вызывает валидацию формы, в зависимости от результата дизейблится или разрешается кнопка собмита
         * @function _checkSubmitEnable
         * @param validator - валидатор
         * @param $buttonSubmit - кнопка сабмита
         * @param {Boolean} focusOnFirstInvalidElement - опредляет, устанавливать ли фокус в первый невалидный элемент ввода
         * @param {Object|null} [checker=null] - если checker определён, тогда проверяем вызываетс толлько его валидация,
         * валидность остальных чекеров определяется по предыдущим состояниям
         * @param {Object|null} [onlyValidatorForCheck=null] - если опрделен, то проверяем только его чекеры
         * @returns {Boolean|null}
         * @private
         */
        function _checkSubmitEnable(validator, $buttonSubmit, focusOnFirstInvalidElement, checker, onlyValidatorForCheck){

            var
                formIsValid = _allFormsAreValid($buttonSubmit, checker, onlyValidatorForCheck);
            if (formIsValid === true && _enableSubmitButton(validator, $buttonSubmit)) {
                /* форма валидная, разрешаем кнопку сабмита и очищаем список ошибок */
                $buttonSubmit.removeAttr('disabled').removeClass('disabled');
            } else if (formIsValid !== true && _disableSubmitButton(validator, $buttonSubmit)){
                /* Если форма невалидна или еще не получили результаты асинхронных проверок
                 * тогда блокируем сабмит формы и выводим те ошибки, которые на данный момент обнаружились
                 * когда придут результаты асинхронных проверок, мы снова дожны попасть в эту функцию
                 * */
                if (formIsValid === null) { // еще не получили результаты асинхронных проверок
                    //  TODO: нарисовать на кнопке спиннер
                }
                $buttonSubmit.attr('disabled', 'disabled').addClass('disabled');
            }
            if (formIsValid === false) {
              _showErrorsList(focusOnFirstInvalidElement === true);
            } else if (formIsValid === true){
                _hideErrorsList();
            }
            return formIsValid;
        }

        function resetButtonTrigger(){
            submitWasClickedTrigger = false;
        }

        function clear(){
            /* сбросим признак того, что кнопка была нажата */
            resetButtonTrigger();
//            _unbindSubmitButton();
            _hideErrorsList(true);
        }

        /* интерфейсная функция isSubmitEnable не возвращает boolean, чтобы не блокировать поля ввода
         при невалидных даных
          поэтому возращется через обертку */
        return {
            isSubmitEnable: function(checker){
                // если не указан конкретный чекер, проверяем все чекеры
                isSubmitEnable(focusOnInvalidElement, checker, validator);
            },
            isSubmitEnableForAllValidators: function(checker){
                isSubmitEnable(focusOnInvalidElement, checker);
            },
            clear: clear,
            getButtonTrigger: function(){ return submitWasClickedTrigger;},
            resetButtonTrigger: resetButtonTrigger,
            rebindSubmit: _bindSubmitButton
        };

        /**
         *
         * @param $buttonSubmit
         * @param checker
         * @param {Object|null} [onlyValidatorForCheck=null] - если параметр определен,
         * тогда будем проверять только его чекеры
         * @returns {boolean}
         * @private
         */
        function _allFormsAreValid($buttonSubmit, checker, onlyValidatorForCheck){
            var isValid = true,
                buttonSubmitInfo = _getCurrentButtonValidatorStates(),
                btnSubmit = $buttonSubmit.get(0),
                i, sb;

            for (i = 0; i < buttonSubmitInfo.length; i++) {
                sb = buttonSubmitInfo[i];
                /*  если указана кнопка, то учитываем валидаторы привязанные к этой кнопке, иначе - вообще все валидаторы */
                if ((!$buttonSubmit || $buttonSubmit.length > 0 || sb.$button.get(0) === btnSubmit)
                    && ( !onlyValidatorForCheck || sb.validator == onlyValidatorForCheck)) {
                    sb.isValid = sb.validator.formIsValid(checker);
                    if (sb.isValid === null) isValid = null;
                    else if (sb.isValid === false && isValid != null) isValid = false;
                }
            }
            return isValid;
        }

        /**
         * Возвращает массив состояний валидаторов, относящихся к текущей кнопке сабмита ($buttonSubmit)
         * @returns {Array}
         * @private
         */
        function _getCurrentButtonValidatorStates(){
            var i, bs, btnSubmit = $buttonSubmit.get(0), submitInfo = [];
            for (i = 0; i < allValidatorButtonStates.length; i++) {
                bs = allValidatorButtonStates[i];
                if (bs.$button.get(0) === btnSubmit) {
                    submitInfo.push(bs);
                }
            }
            return submitInfo;
        }

        function _showErrorsList(focusOnInvalidElement){
            var i, sb, submitInfo = _getCurrentButtonValidatorStates();

            for (i = 0; i < submitInfo.length; i++) {
                sb = submitInfo[i];
                if (!sb.isValid) sb.validator.showErrorsList(focusOnInvalidElement);
            }
        }

        function _hideErrorsList(force){
            var i, sb, submitInfo = _getCurrentButtonValidatorStates();
            for (i = 0; i < submitInfo.length; i++) {
                sb = submitInfo[i];
                if (sb.isValid === true || force === true) sb.validator.hideErrorsList();
            }
        }

        function _enableSubmitButton(validator, $btnSubmit){
            var btnInfo = _getOrRegisterSubmitButton(validator, $btnSubmit);
            btnInfo.isValid = true;
            return _submitIsEnable();

        }

        function _disableSubmitButton(validator, $btnSubmit){
            var btnInfo = _getOrRegisterSubmitButton(validator, $btnSubmit);
            return !_submitIsEnable();

        }

        /* если все валидаторы, привязанные к текущей кнопке валидны, тогда сабмит разрешён */
        function _submitIsEnable(){
            var i, bs, btnSubmit = $buttonSubmit.get(0);
            for (i = 0; i < allValidatorButtonStates.length; i++) {
                bs = allValidatorButtonStates[i];
                if (bs.$button.get(0) === btnSubmit && bs.isValid !== true) return false;
            }
            return true;
        }

    /**
     *
     * @param validator
     * @param $btnSubmit
     * @returns {MC.Common.Validator.ButtonValidatorState}
     * @private
     */
    function _getOrRegisterSubmitButton(validator, $btnSubmit){
        var i, bs, btnSubmit = $btnSubmit.get(0);
        for (i = 0; i < allValidatorButtonStates.length; i++) {
            bs = allValidatorButtonStates[i];
            if (bs.$button.get(0) === btnSubmit && bs.validator === validator) {
                return bs;
            }
        }
        var buttonValidatorState = new  MC.Common.Validator.ButtonValidatorState($btnSubmit, validator, false);
        allValidatorButtonStates.push(buttonValidatorState);

        return buttonValidatorState;
    }

};

MC.Common.Validator.ButtonValidatorState = function($btn, validator, isValid){
    var self = this;
    this.$button = $btn;
    this.validator = validator;
    this.isValid = isValid;

    this.getErrorsItemsList = function(){
        if (!self.validator || !self.validator.errorsItemsList) return null;
        return self.validator.errorsItemsList;
    };

    // TODO: сделать номально через переменные и интерфейс
//    this.isValid = function(){
//        return isValid;
//    };
//
//    this.setValidnes(validness){
//        isValid = validness;
//    }
};

MC.Common.Validator.Helper = {

        addHandler: function($input, handler, events){
            for(var i = 0, len = events.length; i < len; i++){
                $input.on(events[i], handler);
            }
        },

        addAllEventsHandler: function($input, handler){
            this.addHandler($input, handler, ['keyup', 'focus', 'blur', 'change']);
        }
    };


/* Здесь храним информацию о всех валдидаторах на странице с их состоянием и привязкой к кнопкам */
MC.Common.Validator.ValidatorSubmitBehavior._AllValidatorButtonStates = [];
/**
 * Возвращает валидатор, назначенный на кнопку btnSubmit, если такой существует, иначе возвращает null
 * @param {Object} btnSubmit - html-объект кнопка, к которой, возможно, привязан валидатор
 * @param {Boolean} [resetBeforeReturn=true] - если true, тогда перед возвращением у валидатора вызовется метод clear
 * @returns {MC.Common.Validator.ValidatorForm} валидатор, назначенный на кнопку btnSubmit, если такой существует,
 *      иначе возвращает null
 */
MC.Common.Validator.ValidatorSubmitBehavior.getExistsValidator = function(btnSubmit, resetBeforeReturn){
    var validator = null,
        allValidatorButtonStates = MC.Common.Validator.ValidatorSubmitBehavior._AllValidatorButtonStates,
        bs;

    for (var i = allValidatorButtonStates.length; --i >= 0; ){
        bs = allValidatorButtonStates[i];
        if (bs.$button.get(0) === btnSubmit) {
            validator = bs.validator;
            if (!(resetBeforeReturn === false)){
                bs.isValid = true;
                validator.clear();
            }
            break;
        }
    }
    return validator;
};

MC.Common.Validator.ValidatorForm.prototype = {
    setValidateItems: function(checkedItems){
        this.validateItems = checkedItems;
        this.setValidatorForCheckedItems(this.validateItems);
    },

    setValidatorForCheckedItems: function(checkedItems) {
        if (!checkedItems) return;
        for (var i = checkedItems.length; --i >= 0;) {
            var checkedItem = checkedItems[i];
            if (checkedItem && checkedItem.setValidator) {
                checkedItem.setValidator(this);
            }
        }
    },

    /**
     * Проверяет валидность полей формы и заносит обнаруженные ошибки в this.errorsItemsList
     * @param {Object|null} [onlyChecker=null] - если определён, тогда валидация вызывается только у него
     * @param {Boolean} [submitButtonWasClickedTrigger=false]
     * @returns {Boolean|null} - если возвращает null, значит результат неопределён - не выполнились асинхронные проверки
     */
    _formIsValid: function(onlyChecker, submitButtonWasClickedTrigger) {
        var
            self = this,
            async = false,
            checkerIsValid,
            checkerLastError,
            checkAll = !onlyChecker;

        this.errorsItemsList = [];
        for (var i = 0, len = this.validateItems.length; i < len; i++) {
            var validateItem = this.validateItems[i],
                errorItem = null,
                checker = validateItem.checker;
            // выполняем проверку, если элемент этого требует (например, асинхронные запросы) или кнопка была нажата
            if ( checkAll // если вызов нажатием кнопки, тогда участвуют все чекеры
                || checker.shouldCheckImmediately === true // или это чекер который и должен вызываться всегда
                // или вызов был сделан для конкретного чекера после того, как кнопка сабмита была нажата
                // хотя бы один раз (раньше или сейчас)
                || (checker === onlyChecker && submitButtonWasClickedTrigger)
                ) {
//            if ((!onlyChecker || checker === onlyChecker) // - чекер не указан или указан конкретный чекер и мы дошли до него по списку
//                && (submitButtonWasClickedTrigger || checker.shouldCheckImmediately === true)) {
                var checkResult = checker.doCheck(validateItem.$item, this);
                if (checkResult === false) {
                    checker.setValidness(false);

                    /* текст ошибки сформировался динамически во время процедуры проверки ? */
                    var fieldErrorText = checker.getErrorText();
                    if (fieldErrorText == null) { // нет, динамически не сформировался, берем статическое описание ошибки
                        fieldErrorText = validateItem.fieldErrorText;
                    }
                    if (errorItem == null) {
                        errorItem = _createErrorItem(validateItem, fieldErrorText);
                        checker.setLastErrorText(fieldErrorText);
                    }

                    if (validateItem.listErrorText) {
                        errorItem.listErrorText = validateItem.listErrorText;
                    }
                } else if (checkResult === true) {
                    checker.setLastErrorText(null);
                    checker.setValidness(true);
                    // TODO: Нужно накапливать информацию об элементах поменявшими состяние на валидное,
                    // а после цикла вызывать validateItem.markElementAsValid(), может получиться так, что один чекер
                    // пройдет валидацию на этом элементе, а следующий снова объявит элемент невалидным
                    if (validateItem.markElementAsValid) validateItem.markElementAsValid();
                }
                // в случае, если первый раз был отправлен асинхронный запрос, результат сейчас неизвестен
                else if (checkResult == null) {
                    async = true;
                    checker.setValidness(null);
                }

            }
            else {
                checkerIsValid = checker.isValid();
                checkerLastError = checker.getLastErrorText();

                if (checkerIsValid !== true && !(checkerIsValid == null && checkerLastError == null)) { //фунцию проверки не вызываем, а пользуемся предыдущими результатами
                    errorItem = _createErrorItem(validateItem, checkerLastError);
                }
            }

            if (errorItem) {
                //                console.log('formIsValid() errorItem.fieldErrorText=' + errorItem.fieldErrorText + ' errorItem.listErrorText=' + errorItem.listErrorText );
                this.errorsItemsList.push(errorItem);
            }
        }
        var is_valid = this.errorsItemsList.length === 0;
        this.was_invalid_checked = !is_valid;
//        $.each(this.errorsItemsList, function(i, errorItem){
//           console.log('\terror: ' + errorItem.fieldErrorText);
//        });
        return async === true ? null : is_valid;

        function _createErrorItem(validateItem, textError){
            return {
                    $item: validateItem.$item,
                    fieldErrorText: textError,
                    showError: validateItem.showError,
                    getItemErrorLine: validateItem.getItemErrorLine,
                    markElementAsInvalid: validateItem.markElementAsInvalid,
                    markElementAsValid: validateItem.markElementAsValid
                };
        }
    },

    // TODO: I don't understand why many forms invoke this method not formIsValid
    checkSubmitEnable: function() {
        return this.formIsValid();
    },

    hideErrorsList: function() {
        this.errorsItemsList.splice(0, this.errorsItemsList.length);

    },

    focusOnFirstInvalidField: function(){
        var
            i, len = this.errorsItemsList.length;
        if (!len) return;

        for (i = 0; i <= len; i++) {
            var ei = this.errorsItemsList[i];
            if (!ei || !ei.$item) continue;
            ei.$item.focus();
            return;
        }
    }

};
console.log('JavaScript "validation.js" loaded & executed')
