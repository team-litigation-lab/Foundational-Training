// A trainee signs in, in the browser tests. The name + batch form is gone: trainees arrive from the LSH Training Portal
// with a ticket (js/portal-gate.js), and the test server has no Portal secret. So the test puts the form's three fields on
// the page, out of sight, and runs the page's own submitLogin(), which registers and signs the trainee in as the form did.
// Usage: const signIn = require('./sign-in.cjs'); await signIn(page, 'First', 'Last', 'BATCH');
module.exports = async function signIn(page, first, last, batch) {
    await page.waitForFunction(() => typeof submitLogin === 'function', null, { timeout: 15000 });
    await page.evaluate(async ([first, last, batch]) => {
        const box = document.createElement('div');
        box.style.cssText = 'position:fixed;left:-9999px;top:0';
        box.innerHTML = '<input id="loginFirstInput"><input id="loginLastInput"><input id="loginBatchInput">';
        document.body.appendChild(box);
        document.getElementById('loginFirstInput').value = first;
        document.getElementById('loginLastInput').value = last;
        document.getElementById('loginBatchInput').value = batch;
        try { await submitLogin(); } finally { box.remove(); }
    }, [first, last, batch]);
    await page.waitForTimeout(1200);
};
