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
import PropertyManagement from './pages/PropertyManagement';
import PropertyManagementAssociation from './pages/PropertyManagementAssociation';
import PropertyManagementUnit from './pages/PropertyManagementUnit';
import PropertyManagementImports from './pages/PropertyManagementImports';
import PropertyManagementImportsAppFolioHomeownerDirectory from './pages/PropertyManagementImportsAppFolioHomeownerDirectory';
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
    "PropertyManagement": PropertyManagement,
    "PropertyManagementAssociation": PropertyManagementAssociation,
    "PropertyManagementUnit": PropertyManagementUnit,
    "PropertyManagementImports": PropertyManagementImports,
    "PropertyManagementImportsAppFolioHomeownerDirectory": PropertyManagementImportsAppFolioHomeownerDirectory,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};