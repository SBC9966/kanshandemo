import {validateKnowledge} from '../src/knowledge-engine.mjs';
const report=validateKnowledge();console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
