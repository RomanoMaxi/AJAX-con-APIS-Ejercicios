import STRIPE_KEYS from "./stripe-keys.js";

//console.log(STRIPE_KEYS);

const d = document,
    $tacos=d.getElementById("tacos"),
    $template=d.getElementById("taco-template").content,
    $fragment =d.createDocumentFragment();

//como necesito dos fetch para precios y para los productos
//creo una variable que tenga las dos peticiones
const fetchOptions ={
    headers:{
        //para acceder a la API necesito la clave secreta para conceder permisos
        Authorization:`Bearer ${STRIPE_KEYS.secret}`,
    },
};

let prices,products;

//creo  variable para que los precios me aparezcan con punto decimal, como es una cadena de texto puedo partirla
//le digo que omita los ultimos dos caracteres, para luego interponer la coma y volver a poner los caracteres
const moneyFormat= num => `$${num.slice(0,-2)},${num.slice(-2)}`;
//creo la promesas que  hagan las dos peticiones
//el orden de las peticiones, va a ser el orden de como se van a ir agregando al array
Promise.all([
    //promesa para los productos, con la llave
    fetch("https://api.stripe.com/v1/products", fetchOptions),
    //promesa para los precios con la llave
    fetch("https://api.stripe.com/v1/prices", fetchOptions)
])
.then((responses) => Promise.all(responses.map((res) => res.json())))
.then(json => {
    //console.log(json);
    //ahora guardo en las variables vacias solo que me interesa guardar que vienen en el json:
    products=json[0].data;
    prices=json[1].data;
    console.log(products,prices);

    //ahora para poder crear las tarjetas, creo un forEach para cada elemento que vengan en los precios
    prices.forEach((el) => {
        //comparo los id de cada producto con el número de producto
        let productData = products.filter((product) => product.id === el.product);
        console.log(productData);
        //con template y el clon puedo ya mostrar los productos en el html
        $template.querySelector(".taco").setAttribute("data-price", el.id);
       
        //ahora busco la imagen del producto
        $template.querySelector("img").src= productData[0].images[0];
        $template.querySelector("img").alt= productData[0].name;

        //agrego el figcaption con el producto y nombre del precio. Busco 
        $template.querySelector("figcaption").innerHTML = `
            ${productData[0].name}
            <br>
            ${moneyFormat(el.unit_amount_decimal)} ${el.currency}
        `;

        //como trabajo con template hay que crear un clon
        let $clone = d.importNode($template,true);
        $fragment.appendChild($clone);
    });

    $tacos.appendChild($fragment);
})
.catch((err) => {
    console.log(err);
    let message = err.statusText || "Ocurrió un error al conectarse con la API de Stripe"
    $tacos.innerHTML = `<p> Error ${err.status}: ${message}</p>`;
});

//programo el click para cada evento
d.addEventListener("click", (e) => {
    if(e.target.matches(".taco *")){
        //ahora le devuelvo el precio a Stripe cuando hago click
        let price = e.target.parentElement.getAttribute("data-price");
        //ahora necesito la llave PUBLICA de Stripe, y lo redirijo
        Stripe(STRIPE_KEYS.public)
        .redirectToCheckout({
            //por documentación de Stripe, me pide que le pase el precio (lo tengo en la variable) y la cantidad que es una
            lineItems:[{price,quantity:1}],
            //para pagar una suscripción se usa:
            mode: "subscription",
            //Stripe pide tener una url para cuando se realice exitosamente la compra
            successUrl: "http://127.0.0.1:5500/APIS-Pagos%20Online-%20Fetch-Stripe/assets/stripe-success.html",
            //y una compra de error.
            cancelUrl: "http://127.0.0.1:5500/APIS-Pagos%20Online-%20Fetch-Stripe/assets/stripe-cancel.html",
        }).then((res) => {
            console.log(res);
            if(res.error){
                //en esta línea qes como stripe me indica que señale el error (está en documentación)
                $tacos.insertAdjacentHTML("afterend", res.error.message);
            }
        });
    }
});

//el pago no funciona porque dice que no está habilitado el Checkout para clientes
