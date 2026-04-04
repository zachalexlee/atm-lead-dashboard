import { fetchTacomaPermits, getManualInstructions } from './tacoma-permits.js';

(async () => {
  const permits = await fetchTacomaPermits(90);
  console.log(`\n📊 Result: ${permits.length} permits collected`);
  
  if (permits.length > 0) {
    console.log('\nSample permit:');
    console.log(JSON.stringify(permits[0], null, 2));
  } else {
    console.log(getManualInstructions());
  }
})();
