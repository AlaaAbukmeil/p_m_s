export function formatDateNomura(dateString:any) {
    // Split the input date string by '/'
    const parts = dateString.split('/');

    // Extract month, day, and year from the parts
    const month = parts[0];
    const day = parts[1];
    const year = parts[2];

    // Return the formatted string in 'yyyymmdd' format
    return `${year}${month}${day}`;
}
