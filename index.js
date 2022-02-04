const book = document.querySelector('#book1');

const image = axios.get('https://www.googleapis.com/books/v1/volumes?q=quilting');


const dog = async () => {
    await axios.get('https://www.googleapis.com/books/v1/volumes?q=quilting');
}

console.log(dog);