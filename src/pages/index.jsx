import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import HOAManager from "./HOAManager";

import ResidentForms from "./ResidentForms";

import SurveyHub from "./SurveyHub";

import LinkVault from "./LinkVault";

import PDFForge from "./PDFForge";

import PropertyPulse from "./PropertyPulse";

import InvoiceManager from "./InvoiceManager";

import InvoiceManagerInvoices from "./InvoiceManagerInvoices";

import InvoiceManagerNew from "./InvoiceManagerNew";

import InvoiceManagerDetail from "./InvoiceManagerDetail";

import InvoiceManagerCustomers from "./InvoiceManagerCustomers";

import InvoiceManagerUpload from "./InvoiceManagerUpload";

import InvoiceManagerAdmin from "./InvoiceManagerAdmin";

import InvoiceManagerEdit from "./InvoiceManagerEdit";

import PropertyManagement from "./PropertyManagement";

import PropertyManagementAssociation from "./PropertyManagementAssociation";

import PropertyManagementUnit from "./PropertyManagementUnit";

import PropertyManagementImports from "./PropertyManagementImports";

import PropertyManagementImportsAppFolioHomeownerDirectory from "./PropertyManagementImportsAppFolioHomeownerDirectory";

import GeneralSettings from "./GeneralSettings";

import ParkingManagerVehicles from "./ParkingManagerVehicles";

import AssociationBook from "./AssociationBook";

import HoaManagerImport from "./HoaManagerImport";

import ParkingManagerPermits from "./ParkingManagerPermits";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    HOAManager: HOAManager,
    
    ResidentForms: ResidentForms,
    
    SurveyHub: SurveyHub,
    
    LinkVault: LinkVault,
    
    PDFForge: PDFForge,
    
    PropertyPulse: PropertyPulse,
    
    InvoiceManager: InvoiceManager,
    
    InvoiceManagerInvoices: InvoiceManagerInvoices,
    
    InvoiceManagerNew: InvoiceManagerNew,
    
    InvoiceManagerDetail: InvoiceManagerDetail,
    
    InvoiceManagerCustomers: InvoiceManagerCustomers,
    
    InvoiceManagerUpload: InvoiceManagerUpload,
    
    InvoiceManagerAdmin: InvoiceManagerAdmin,
    
    InvoiceManagerEdit: InvoiceManagerEdit,
    
    PropertyManagement: PropertyManagement,
    
    PropertyManagementAssociation: PropertyManagementAssociation,
    
    PropertyManagementUnit: PropertyManagementUnit,
    
    PropertyManagementImports: PropertyManagementImports,
    
    PropertyManagementImportsAppFolioHomeownerDirectory: PropertyManagementImportsAppFolioHomeownerDirectory,
    
    GeneralSettings: GeneralSettings,
    
    ParkingManagerVehicles: ParkingManagerVehicles,
    
    AssociationBook: AssociationBook,
    
    HoaManagerImport: HoaManagerImport,
    
    ParkingManagerPermits: ParkingManagerPermits,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/HOAManager" element={<HOAManager />} />
                
                <Route path="/ResidentForms" element={<ResidentForms />} />
                
                <Route path="/SurveyHub" element={<SurveyHub />} />
                
                <Route path="/LinkVault" element={<LinkVault />} />
                
                <Route path="/PDFForge" element={<PDFForge />} />
                
                <Route path="/PropertyPulse" element={<PropertyPulse />} />
                
                <Route path="/InvoiceManager" element={<InvoiceManager />} />
                
                <Route path="/InvoiceManagerInvoices" element={<InvoiceManagerInvoices />} />
                
                <Route path="/InvoiceManagerNew" element={<InvoiceManagerNew />} />
                
                <Route path="/InvoiceManagerDetail" element={<InvoiceManagerDetail />} />
                
                <Route path="/InvoiceManagerCustomers" element={<InvoiceManagerCustomers />} />
                
                <Route path="/InvoiceManagerUpload" element={<InvoiceManagerUpload />} />
                
                <Route path="/InvoiceManagerAdmin" element={<InvoiceManagerAdmin />} />
                
                <Route path="/InvoiceManagerEdit" element={<InvoiceManagerEdit />} />
                
                <Route path="/PropertyManagement" element={<PropertyManagement />} />
                
                <Route path="/PropertyManagementAssociation" element={<PropertyManagementAssociation />} />
                
                <Route path="/PropertyManagementUnit" element={<PropertyManagementUnit />} />
                
                <Route path="/PropertyManagementImports" element={<PropertyManagementImports />} />
                
                <Route path="/PropertyManagementImportsAppFolioHomeownerDirectory" element={<PropertyManagementImportsAppFolioHomeownerDirectory />} />
                
                <Route path="/GeneralSettings" element={<GeneralSettings />} />
                
                <Route path="/ParkingManagerVehicles" element={<ParkingManagerVehicles />} />
                
                <Route path="/AssociationBook" element={<AssociationBook />} />
                
                <Route path="/HoaManagerImport" element={<HoaManagerImport />} />
                
                <Route path="/ParkingManagerPermits" element={<ParkingManagerPermits />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}