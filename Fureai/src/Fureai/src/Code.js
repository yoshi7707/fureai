/**
 * Creating a Google Sheets Data Entry Form for CRUD Operations
 * By: bpwebs.com
 * Post URL: https://www.bpwebs.com/crud-operations-on-google-sheets-with-online-forms
 */

//CONSTANTS
const SPREADSHEETID = "1oobo_LWvji1ATqXpDnfHCqrUUaUG7tzvIda4NkceqAs";
const DATARANGE = "Data!A2:I";
const DATASHEET = "Data";
const DATASHEETID = "0";
const LASTCOL = "I";
const IDRANGE = "Data!A2:A";
const DROPDOWNRANGE = "Helpers!A1:A195"; //COUNTRY LIST

//Display HTML page
function doGet(request) {
  let html = HtmlService.createTemplateFromFile('Index').evaluate();
  let htmlOutput = HtmlService.createHtmlOutput(html);
  htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return htmlOutput;
}

//PROCESS SUBMITTED FORM DATA
function processForm(formObject) {
  if (formObject.recId && checkId(formObject.recId)) {
    const values = [[
      formObject.recId,
      formObject.name,
      formObject.sujioya,
      formObject.countryOfOrigin,
      formObject.condition,
      formObject.price,
      formObject.quantity,
      formObject.category,
      formObject.description,

      new Date().toLocaleString()
    ]];
    const updateRange = getRangeById(formObject.recId);
    //Update the record
    updateRecord(values, updateRange);
  } else {
    //Prepare new row of data
    let values = [[
      generateUniqueId(),
      formObject.name,
      formObject.sujioya,
      formObject.countryOfOrigin,
      formObject.condition,
      formObject.price,
      formObject.quantity,
      formObject.category,
      formObject.description,

      new Date().toLocaleString()
    ]];

    //Create new record
    createRecord(values);
  }

  //Return the last 10 records
  return getLastTenRecords();
}


/**
 * CREATE RECORD
 * REF:
 * https://developers.google.com/sheets/api/guides/values#append_values
 */
function createRecord(values) {
  try {
    let valueRange = Sheets.newRowData();
    valueRange.values = values;

    let appendRequest = Sheets.newAppendCellsRequest();
    appendRequest.sheetId = SPREADSHEETID;
    appendRequest.rows = valueRange;

    Sheets.Spreadsheets.Values.append(valueRange, SPREADSHEETID, DATARANGE, { valueInputOption: "RAW" });
  } catch (err) {
    console.log('Failed with error %s', err.message);
  }
}

/**
 * READ RECORD
 * REF:
 * https://developers.google.com/sheets/api/guides/values#read
 */
function readRecord(range) {
  try {
    let result = Sheets.Spreadsheets.Values.get(SPREADSHEETID, range);
    return result.values;
  } catch (err) {
    console.log('Failed with error %s', err.message);
  }
}

/**
 * UPDATE RECORD
 * REF:
 * https://developers.google.com/sheets/api/guides/values#write_to_a_single_range
 */
function updateRecord(values, updateRange) {
  try {
    let valueRange = Sheets.newValueRange();
    valueRange.values = values;
    Sheets.Spreadsheets.Values.update(valueRange, SPREADSHEETID, updateRange, { valueInputOption: "RAW" });
  } catch (err) {
    console.log('Failed with error %s', err.message);
  }
}


/**
 * DELETE RECORD
 * Ref:
 * https://developers.google.com/sheets/api/guides/batchupdate
 * https://developers.google.com/sheets/api/samples/rowcolumn#delete_rows_or_columns
*/
function deleteRecord(id) {
  const rowToDelete = getRowIndexById(id);
  const deleteRequest = {
    "deleteDimension": {
      "range": {
        "sheetId": DATASHEETID,
        "dimension": "ROWS",
        "startIndex": rowToDelete,
        "endIndex": rowToDelete + 1
      }
    }
  };
  Sheets.Spreadsheets.batchUpdate({ "requests": [deleteRequest] }, SPREADSHEETID);
  return getLastTenRecords();
}


/**
 * RETURN LAST 10 RECORDS IN THE SHEET
 */
function getLastTenRecords() {
  let lastRow = readRecord(DATARANGE).length + 1;
  let startRow = lastRow - 9;
  if (startRow < 2) { //If less than 10 records, eleminate the header row and start from second row
    startRow = 2;
  }
  let range = DATASHEET + "!A" + startRow + ":" + LASTCOL + lastRow;
  let lastTenRecords = readRecord(range);
  Logger.log(lastTenRecords);
  return lastTenRecords;
}


//GET ALL RECORDS
function getAllRecords() {
  const allRecords = readRecord(DATARANGE);
  return allRecords;
}

//GET RECORD FOR THE GIVEN ID
function getRecordById(id) {
  if (!id || !checkId(id)) {
    return null;
  }
  const range = getRangeById(id);
  if (!range) {
    return null;
  }
  const result = readRecord(range);
  return result;
}

function getRowIndexById(id) {
  if (!id) {
    throw new Error('Invalid ID');
  }

  const idList = readRecord(IDRANGE);
  for (var i = 0; i < idList.length; i++) {
    if (id == idList[i][0]) {
      var rowIndex = parseInt(i + 1);
      return rowIndex;
    }
  }
}


//VALIDATE ID
function checkId(id) {
  const idList = readRecord(IDRANGE).flat();
  return idList.includes(id);
}


//GET DATA RANGE IN A1 NOTATION FOR GIVEN ID
function getRangeById(id) {
  if (!id) {
    return null;
  }
  const idList = readRecord(IDRANGE);
  const rowIndex = idList.findIndex(item => item[0] === id);
  if (rowIndex === -1) {
    return null;
  }
  const range = `Data!A${rowIndex + 2}:${LASTCOL}${rowIndex + 2}`;
  return range;
}


//INCLUDE HTML PARTS, EG. JAVASCRIPT, CSS, OTHER HTML FILES
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

//GENERATE UNIQUE ID
function generateUniqueId() {
  let id = Utilities.getUuid();
  return id;
}

function getCountryList() {
  countryList = readRecord(DROPDOWNRANGE);
  return countryList;
}

//SEARCH RECORDS
function searchRecords(formObject) {
  let result = [];
  try {
    if (formObject.searchText) {//Execute if form passes search text
      const data = readRecord(DATARANGE);
      const searchText = formObject.searchText;

      // Loop through each row and column to search for matches
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          const cellValue = data[i][j];
          if (cellValue.toLowerCase().includes(searchText.toLowerCase())) {
            result.push(data[i]);
            break; // Stop searching for other matches in this row
          }
        }
      }
    }
  } catch (err) {
    console.log('Failed with error %s', err.message);
  }
  return result;
}