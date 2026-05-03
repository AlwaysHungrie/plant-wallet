
import { createTerminalProcess, getTerminalProcess } from '../src/services/terminal-service.js';
import { TERMINAL_MAX_LIFE } from '../src/constants/config.js';

async function verify() {
    console.log(`Configured MAX_LIFE: ${TERMINAL_MAX_LIFE}ms`);

    console.log("\n--- Test 1: Terminal Expiry ---");
    // Spawn a long-running process (sleep 10)
    const { terminalId, proc } = createTerminalProcess('sleep', ['10']);
    console.log(`Spawned terminal ${terminalId} with PID ${proc.pid}`);

    // Wait for slightly longer than MAX_LIFE
    console.log(`Waiting ${TERMINAL_MAX_LIFE + 1000}ms for expiry...`);
    await new Promise(resolve => setTimeout(resolve, TERMINAL_MAX_LIFE + 1000));

    const activeProc = getTerminalProcess(terminalId);
    if (!activeProc) {
        console.log("SUCCESS: Terminal was correctly terminated after expiry.");
    } else {
        console.error("FAILURE: Terminal is still alive after expiry!");
    }

    console.log("\n--- Test 2: Normal Exit ---");
    // Spawn a short-running process (echo hello)
    const { terminalId: id2, proc: proc2 } = createTerminalProcess('echo', ['hello']);
    console.log(`Spawned terminal ${id2} with PID ${proc2.pid}`);

    // Wait for it to finish normally (1s should be enough)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const activeProc2 = getTerminalProcess(id2);
    if (!activeProc2) {
        console.log("SUCCESS: Terminal cleaned up after normal exit.");
    } else {
        console.error("FAILURE: Terminal entry still exists after normal exit!");
    }
    
    console.log("\nVerification complete. Please check the server logs for 'lifespan has expired' messages.");
    console.log("Expectation: Logged for Test 1, NOT logged for Test 2.");
}

verify().catch(console.error);
