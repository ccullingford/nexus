import Dashboard from './pages/Dashboard';
import HOAManager from './pages/HOAManager';
import ResidentForms from './pages/ResidentForms';
import SurveyHub from './pages/SurveyHub';
import LinkVault from './pages/LinkVault';
import PDFForge from './pages/PDFForge';
import PropertyPulse from './pages/PropertyPulse';
import InvoiceManager from './pages/InvoiceManager';
import InvoiceManagerInvoices from './pages/InvoiceManagerInvoices';
import InvoiceManagerNew from './pages/InvoiceManagerNew';
import InvoiceManagerDetail from './pages/InvoiceManagerDetail';
import InvoiceManagerCustomers from './pages/InvoiceManagerCustomers';
import InvoiceManagerUpload from './pages/InvoiceManagerUpload';
import InvoiceManagerAdmin from './pages/InvoiceManagerAdmin';
import InvoiceManagerEdit from './pages/InvoiceManagerEdit';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "HOAManager": HOAManager,
    "ResidentForms": ResidentForms,
    "SurveyHub": SurveyHub,
    "LinkVault": LinkVault,
    "PDFForge": PDFForge,
    "PropertyPulse": PropertyPulse,
    "InvoiceManager": InvoiceManager,
    "InvoiceManagerInvoices": InvoiceManagerInvoices,
    "InvoiceManagerNew": InvoiceManagerNew,
    "InvoiceManagerDetail": InvoiceManagerDetail,
    "InvoiceManagerCustomers": InvoiceManagerCustomers,
    "InvoiceManagerUpload": InvoiceManagerUpload,
    "InvoiceManagerAdmin": InvoiceManagerAdmin,
    "InvoiceManagerEdit": InvoiceManagerEdit,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};