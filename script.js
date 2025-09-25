document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    const buttons = document.getElementById('buttons');

    let currentInput = '';
    let operator = null;
    let firstOperand = null;
    let waitForSecondOperand = false;

    function updateDisplay() {
        display.value = currentInput || '0';
    }

    function clear() {
        currentInput = '';
        operator = null;
        firstOperand = null;
        waitForSecondOperand = false;
        updateDisplay();
    }

    function inputDigit(digit) {
        if (waitForSecondOperand) {
            currentInput = digit;
            waitForSecondOperand = false;
        } else {
            if (digit === '.' && currentInput.includes('.')) return;
            currentInput = (currentInput === '0' && digit !== '.') ? digit : currentInput + digit;
        }
        updateDisplay();
    }

    function handleOperator(nextOperator) {
        const inputValue = parseFloat(currentInput);

        if (operator && waitForSecondOperand) {
            operator = nextOperator;
            return;
        }

        if (firstOperand === null) {
            firstOperand = inputValue;
        } else if (operator) {
            const result = performCalculation[operator](firstOperand, inputValue);
            currentInput = String(result);
            firstOperand = result;
        }

        waitForSecondOperand = true;
        operator = nextOperator;
        updateDisplay();
    }

    const performCalculation = {
        '/': (first, second) => first / second,
        '*': (first, second) => first * second,
        '+': (first, second) => first + second,
        '-': (first, second) => first - second,
        '=': (first, second) => second
    };


    buttons.addEventListener('click', (event) => {
        const { target } = event;
        const value = target.textContent;

        if (!target.matches('button')) return;

        if (target.classList.contains('number') || value === '.') {
            inputDigit(value);
            return;
        }

        if (target.classList.contains('operator')) {
            handleOperator(value);
            return;
        }

        if (target.classList.contains('equal-btn')) {
            handleOperator(operator);
            operator = null;
            return;
        }

        if (target.classList.contains('clear-btn')) {
            clear();
            return;
        }
    });

    updateDisplay();
});
