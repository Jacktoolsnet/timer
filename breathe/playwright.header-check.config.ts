import base from './playwright.config';
export default {...base,use:{...base.use,baseURL:'http://127.0.0.1:4605'},webServer:{command:'npm run dev -- --port 4605 --ignore-lock',url:'http://127.0.0.1:4605',reuseExistingServer:false}};
