import Dashboard from './pages/Dashboard';
import HOAManager from './pages/HOAManager';
import InvoiceFlow from './pages/InvoiceFlow';
import ResidentForms from './pages/ResidentForms';
import SurveyHub from './pages/SurveyHub';
import LinkVault from './pages/LinkVault';
import PDFForge from './pages/PDFForge';
import PropertyPulse from './pages/PropertyPulse';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "HOAManager": HOAManager,
    "InvoiceFlow": InvoiceFlow,
    "ResidentForms": ResidentForms,
    "SurveyHub": SurveyHub,
    "LinkVault": LinkVault,
    "PDFForge": PDFForge,
    "PropertyPulse": PropertyPulse,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};