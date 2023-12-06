const body = document.querySelector("body");
const jeopardyBoard = document.querySelector("#jeopardy-board");
const jeopardyBoardHead = document.querySelector("#jeopardy-board-head"); //contains row of Jeopardy categories
const jeopardyBoardBody = document.querySelector("#jeopardy-board-body"); //contains the 5 rows of clues (1 for each category)
const newGameButton = document.querySelector("#new-game-button"); //button to start the first game or restart a new game

/* categoriesAndClues is the object that will be used throughout this app to fill out the board with category names, clues for each
category, and answers to each of the clues. 
It's an array of objects, where each object corresponds to a column on the board and has a categoryName property as well as clues
property, which is an array of clues. Each clue is an object that contains string properties such as the question, answer,
and what is currently being displayed on the board.   */
let categoriesAndClues= []; 
let hasGameStarted = false; //Used to keep track of whether we need to create the board or simply reset it.

newGameButton.addEventListener("click", async (event) => {
    event.target.innerText = "LOADING...";
    await startNewGame();
    event.target.innerText = "RESTART NEW GAME";
});

async function startNewGame() {
    //Make calls to the jService API to retrieve random categories and 5 random clues for each category, then set up and display the game board.
    const NUMBER_CATEGORIES = 6;
    categoriesAndClues = await getCategoriesAndClues(NUMBER_CATEGORIES);
    console.log(categoriesAndClues);
    if (!hasGameStarted) {
        //We are starting a game for the first time, so we must create the board first and append it to the DOM.
        createJeopardyBoard(categoriesAndClues);
        jeopardyBoard.addEventListener("click", validateBoardClick);
        hasGameStarted = true;
    } else {
        //We are restarting the game. The board is already created and displayed, so we simply reset the values of its cells.
        resetJeopardyBoard(categoriesAndClues);
    }
}

async function getCategoriesAndClues(numberCategories) {
    //Select and return 6 random Jeopardy! categories as well as 5 random clues for each category through calls to jService API.
    //Then combine information from both the categories and clues returned into a single object that is returned.
    const categories = await getCategories(6);
    const clues = await getCluesForCategories(categories);
    return combineCategoriesAndClues(categories, clues);
}

async function getCategories(numberCategories) {
    //Select and return "numberCategories" number of category objects from an array of 100 category objects that is returned by a call to the jService API.
    //Each category object contains information such as the category name, the category id, and the number of clues available for that category.
    const resCategories = await getCategoriesFromResponse();
    const validResCategories = filterCategoriesFromResponse(resCategories);
    const selectedCategories = getNRandomEntries(validResCategories, numberCategories);
    return selectedCategories;
}

async function getCategoriesFromResponse() {
    //Send a GET request to jService API and return an array of 100 random category objects in the response.
    const categoryOffset = Math.floor(Math.random() * 10000); //Offset ensures random categories are returned each time.
    const res = await axios.get('https://jservice.io/api/categories', {params: {count: 100, offset: categoryOffset}});
    return res.data;
}

function filterCategoriesFromResponse(unfilteredCategories) {
    //Ensures that all category objects returned have at least 5 clues for each.
    return unfilteredCategories.filter(category => category.clues_count >= 5);
}

function getNRandomEntries(arrayName, n) {
    //Samples the array arrayName and returns an n-length array containing n distinct entries in arrayName.
    //_.sampleSize function (from lodash library) is used for this.
    return _.sampleSize(arrayName, n);
}

async function getCluesForCategories(arrayOfCategories) {
    // Takes in an array of categories and returns an array where each entry is an array of 5 clues for each category in 
    // the array of categories. Each category's id is used to call the jService API to retrieve clues for that specific category.
    let arrayOfClues = [];
    for (let category of arrayOfCategories) {
        let cluesForCategory = await getCluesFromResponse(category.id);
        if (category.clues_count > 5) { //Ensure that there are just 5 clues for each category.
            cluesForCategory = getNRandomEntries(cluesForCategory, 5);
        }
        cluesForCategory = addDisplayProperty(cluesForCategory); //add a property to each clue object to keep track of what the game board is currently displaying.
        arrayOfClues.push(cluesForCategory);
    }
    return arrayOfClues;
}

async function getCluesFromResponse(categoryId) {
    //Makes a GET request to the jservice API to return an array of clues for the specific category id.
    //Each clue object contains information such as the question and the answer for the clue.
    const res = await axios.get('https://jservice.io/api/clues', {params: {category: categoryId}});
    return res.data;
}

function addDisplayProperty(cluesForCategory) {
    /* Each clue object from the jService API doesn't have a property that can be used to keep track of what the game board is currently displaying.
    Thus, that property will be added here. For each clue in the cluesForCategory array of clue objects, we will add a displaying property that is initialized 
    to "?", which is what each clue cell of the board will first display. This will be changed to "question" when the user clicks on one of the clue cells, and then
    changed to "answer" when the user clicks on the same clue cell again. */
    for (let clue of cluesForCategory) {
        clue.displaying = "?";
    }
    return cluesForCategory;
}

function combineCategoriesAndClues(categories, clues) {
    //Organize categories and clues by returning an array that contains just the category name as well as the clues associated with it.
    return categories.map((category, index) => {
        return {categoryName: category.title, clues: clues[index]};
    });
}

function createJeopardyBoard(categoriesAndClues) {
    /* Creates each cell in the table and appends them to the DOM so that the full table is displayed. 
    Begins with the table header, aka the top row that displays each category, then the table body where the clues under each category will be displayed. */

    //Create top row displaying the categories
    const categoryRow = document.createElement("tr");
    for (let entry of categoriesAndClues) {
        const categoryCell = document.createElement("th");
        categoryCell.innerText = entry.categoryName;
        categoryRow.append(categoryCell);
    }
    jeopardyBoardHead.append(categoryRow);
    //Create rest of the rows that for clues for these categories, each cell will initially display a question mark.
    for (let i = 0; i < categoriesAndClues[0].clues.length; i++) {
        const clueRow = document.createElement("tr");
        for (let j = 0; j < categoriesAndClues.length; j++) {
            const clueCell = document.createElement("td");
            clueCell.innerText = "?";
            clueCell.classList.add(i + "-" + j); //This will be used to keep track of which row and column each clue cell is on.
            clueRow.append(clueCell);
        }
        jeopardyBoardBody.append(clueRow);
    }
}

function resetJeopardyBoard(categoriesAndClues) {
    /* Here, we are restarting a game with new categories and clues instead of playing a new game for the first time. 
    Since the board has already been created, we just have to reset the top row of the board to match the new categories retrieved as well as
    reset the value of each clue cell to a question mark */
    const categoryRow = jeopardyBoardHead.firstElementChild;
    for (let i = 0; i < categoriesAndClues.length; i++) {
        categoryRow.children[i].innerText = categoriesAndClues[i].categoryName; //reset top row to display new categories.
    }
    for (let i = 0; i < categoriesAndClues[0].clues.length; i++) {
        const clueRow = jeopardyBoardBody.children[i];
        for (let j = 0; j < categoriesAndClues.length; j++) {
            clueRow.children[j].innerText = "?"; //Fill out the rest of the cells (the ones that will display the question then answer) with a question mark.
        }
    }
}

function validateBoardClick(event) {
    //Using event delegation, make sure the element clicked was one of the clue cells in the table body. If it is, then reveal the clue or answer depending on how
    // many times that cell has been clicked.
    if (event.target.tagName === "TD") {
        revealClueOrAnswer(event.target, categoriesAndClues);
    }
}

function revealClueOrAnswer(clueClicked, categoriesAndClues) {
    /* Look up the row and column number of the clue cell that was clicked by examining the class given to this clue cell back when the jeopardy board was first
    created. Then, determine what the cell is currently displaying by looking up the "displaying" property of the corresponding clue object to determine the new
    value that the clue cell should display. */
    const {row, column} = getClueRowAndColumn(clueClicked); //retrieve the row and column the clue cell is on.
    if (categoriesAndClues[column].clues[row].displaying === "?") {
        //if the cell is currently displaying a question mark, update that cell to display its corresponding clue.
        revealClueOnBoard(clueClicked, categoriesAndClues, row, column);
        updateDisplayingProperty(categoriesAndClues, row, column, "question");
    } 
    else if (categoriesAndClues[column].clues[row].displaying === "question") {
        //if the cell is currently displaying the clue, update that cell to display the answer to the question.
        revealAnswerOnBoard(clueClicked, categoriesAndClues, row, column);
        updateDisplayingProperty(categoriesAndClues, row, column, "answer");
    }
    
}

function getClueRowAndColumn(clueClicked) {
    //When the board was first created, each clue cell was given a class of "i-j", where i is the zero-indexed row and j is the zero-indexed column. 
    //This function extracts the row and column from this class name and returns an object containing those values.
    const dashIndex = clueClicked.classList[0].indexOf("-");
    const rowAsString = clueClicked.classList[0].substring(0, dashIndex);
    const columnAsString = clueClicked.classList[0].substring(dashIndex+1);
    return {row: Number(rowAsString), column: Number(columnAsString)};
}

function revealClueOnBoard(clueClicked, categoriesAndClues, row, column) {
    //update the board so that the cell that was clicked now displays its corresponding clue in the categoriesAndClues object.
    clueClicked.innerText = categoriesAndClues[column].clues[row].question;
}

function revealAnswerOnBoard(clueClicked, categoriesAndClues, row, column) {
    //update the board so that the cell that was clicked now displays its corresponding answer in the categoriesAndClues object.
    clueClicked.innerHTML = "What is " + categoriesAndClues[column].clues[row].answer;
}

function updateDisplayingProperty(categoriesAndClues, row, column, newValue) {
    categoriesAndClues[column].clues[row].displaying = newValue;
}
