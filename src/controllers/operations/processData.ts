export function changeHubspotContactCompanyToSqlForm(array: any) {
  return array.map((obj: any) => {
    return {
      annual_revenue: obj["Annual Revenue"],
      city: obj["City"],
      company_domain_name: obj["Company Domain Name"],
      company_name: obj["Company name"],
      country_region: obj["Country/Region"],
      description: obj["Description"],
      linkedin_bio: obj["LinkedIn Bio"],
      linkedin_company_page: obj["LinkedIn Company Page"],
      number_of_employees: obj["Number of Employees"],
      phone_number: obj["Phone Number"],
      postal_code: obj["Postal Code"],
      state_region: obj["State/Region"],
      street_address: obj["Street Address"],
      time_zone: obj["Time Zone"],
      website_url: obj["Website URL"],
      contact_with_primary_company: obj["Contact with Primary Company"],
      associated_contact: obj["Associated Contact"],
    };
  });
}
export function changeHubspotContactPeopleToSqlForm(array: any) {
  return array.map((obj: any) => {
    return {
      first_name: obj["First Name"],
      last_name: obj["Last Name"],
      city: obj["City"],
      company_name: obj["Company Name"],
      country: obj["Country/Region"],
      description: obj["Description"],
      email: obj["Email"],
      job_title: obj["Job Title"],
      phone_number: obj["Phone Number"],
      website_url: obj["Website URL"],
      associated_company: obj["Associated Company"],
      associated_note: obj["Associated Note"],
    };
  });
}
