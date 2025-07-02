// === HTML要素の取得 ===
const codeContainer = document.getElementById('code-container');
const questionEl = document.getElementById('question');
const answerInput = document.getElementById('answer-input');
const submitButton = document.getElementById('submit-button');
const nextButton = document.getElementById('next-button');
const resultEl = document.getElementById('result');
const confirmButton = document.getElementById('confirm-button');

// === ゲームの設定 ===
const pythonCode = `# このPythonコードの実行をトレースします
a = 15
b = 10

if a > b:
    result = a + b
else:
    result = a - b

c = result * 2`;

const quizSteps = [
    {
        type: 'control_flow',
        line: 5,
        questionText: "問1: 5行目のif文が評価された後、次に実行されるのは何行目ですか？ (6か8で回答)",
        correctAnswer: 6
    },
    {
        type: 'variable_value',
        line: 6,
        variable: 'result',
        questionText: "問2: 6行目が実行された後の変数 'result' の値は？"
    },
    {
        type: 'variable_value',
        line: 10,
        variable: 'c',
        questionText: "問3: 10行目が実行された後の変数 'c' の値は？"
    }
];

let currentStep = 0;
let pyodide = null;

// === 関数の定義 ===

function setupQuizStep(stepIndex) {
    const allLines = document.querySelectorAll('#code-container .line');
    allLines.forEach(line => line.classList.remove('highlight'));

    const step = quizSteps[stepIndex];
    questionEl.textContent = step.questionText;
    answerInput.value = '';
    resultEl.textContent = '';
    answerInput.disabled = false;
    submitButton.style.display = 'inline-block';
    nextButton.style.display = 'none';
}

function displayCodeWithLineNumbers(container, code) {
    container.innerHTML = '';
    const lines = code.split('\n');
    lines.forEach((lineText, index) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'line';
        const numberEl = document.createElement('span');
        numberEl.className = 'line-number';
        numberEl.textContent = index + 1;
        const codeEl = document.createElement('span');
        codeEl.className = 'code-line';
        codeEl.textContent = lineText;
        lineEl.appendChild(numberEl);
        lineEl.appendChild(codeEl);
        container.appendChild(lineEl);
    });
}

async function getVariableValueAtLine(line, variable) {
    await pyodide.runPythonAsync(`
import sys
mods = list(sys.modules.keys())
for mod in mods:
    if not mod.startswith('_') and mod not in ['sys', 'js', 'pyodide', 'micropip']:
        del sys.modules[mod]
    `);
    const lines = pythonCode.split('\n');
    const codeToRun = lines.slice(0, line).join('\n');
    await pyodide.runPythonAsync(codeToRun);
    return pyodide.globals.get(variable);
}

function getExecutionPath() {
    return [2, 3, 5, 6, 10];
}

/**
 * ★★★ この関数を修正しました ★★★
 * 実行パスを一行ずつアニメーションでハイライトする関数
 */
function highlightExecutionPath() {
    const allLines = document.querySelectorAll('#code-container .line');
    const path = getExecutionPath();
    let step = 0;
    let lastHighlightedLine = null; // 直前にハイライトした行を記憶する変数

    // アニメーション中はボタンを無効化
    confirmButton.disabled = true;

    const intervalId = setInterval(() => {
        // 前回のハイライトを消す
        if (lastHighlightedLine) {
            lastHighlightedLine.classList.remove('highlight');
        }

        // 実行パスの最後まで到達したら、インターバルを停止
        if (step >= path.length) {
            clearInterval(intervalId);
            confirmButton.disabled = false; // ボタンを再度有効化
            return;
        }

        // 現在の行をハイライト
        const currentLineIndex = path[step] - 1;
        const currentLineEl = allLines[currentLineIndex];
        if (currentLineEl) {
            currentLineEl.classList.add('highlight');
            lastHighlightedLine = currentLineEl; // ハイライトした行を記憶
        }

        step++; // 次のステップへ
    }, 600); // 0.6秒ごとに実行
}


// === メインの処理 ===

async function main() {
    displayCodeWithLineNumbers(codeContainer, pythonCode);
    pyodide = await loadPyodide();
    console.log('Pyodideの準備ができました。');

    setupQuizStep(currentStep);

    confirmButton.addEventListener('click', highlightExecutionPath);

    submitButton.addEventListener('click', async () => {
        const step = quizSteps[currentStep];
        const playerAnswer = parseInt(answerInput.value, 10);
        if (isNaN(playerAnswer)) {
            resultEl.textContent = '数値を入力してください。';
            resultEl.style.color = 'orange';
            return;
        }
        let isCorrect = false;
        let correctAnswerValue;
        if (step.type === 'control_flow') {
            correctAnswerValue = step.correctAnswer;
            if (playerAnswer === correctAnswerValue) {
                isCorrect = true;
            }
        } else if (step.type === 'variable_value') {
            correctAnswerValue = await getVariableValueAtLine(step.line, step.variable);
            if (playerAnswer === correctAnswerValue) {
                isCorrect = true;
            }
        }
        if (isCorrect) {
            resultEl.textContent = `正解！ 答えは ${correctAnswerValue} です。`;
            resultEl.style.color = 'green';
            answerInput.disabled = true;
            submitButton.style.display = 'none';
            if (currentStep < quizSteps.length - 1) {
                nextButton.style.display = 'inline-block';
            } else {
                resultEl.textContent += ' 🎉ゲームクリア！';
            }
        } else {
            resultEl.textContent = `不正解...。もう一度考えてみよう！`;
            resultEl.style.color = 'red';
        }
    });

    nextButton.addEventListener('click', () => {
        currentStep++;
        if (currentStep < quizSteps.length) {
            setupQuizStep(currentStep);
        }
    });
}

main();