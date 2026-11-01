import base from './playwright.config';
export default {...base,use:{...base.use,baseURL:'http://127.0.0.1:4606'},webServer:{command:'npm run dev -- --port 4606 --ignore-lock',url:'http://127.0.0.1:4606',reuseExistingServer:false}};
