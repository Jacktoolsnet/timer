import base from './playwright.config';
export default {...base,use:{...base.use,baseURL:'http://127.0.0.1:4604'},webServer:{command:'npm run dev -- --port 4604 --ignore-lock',url:'http://127.0.0.1:4604',reuseExistingServer:false}};
