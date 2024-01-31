// function for hamburger menu
$(".navbar-burger").click(function() {
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");
});
  
function createLocationsArray() {
    //Fetch the parent container that is housing all location divs
    let locationContainer = $('#locationsContainer');
    
    console.log(locationContainer);

    //array where all the data will be stored
    let locationsArray = [];

    //Create a while loop the continues while the container has children
        while($('#locationsContainer').children().length > 0){
            let div = $('#locationsContainer :first-child');
            let fullAddress = div.attr("data-fullAddress");
            let latitude = parseFloat(div.attr('data-lat'));
            let longitude = parseFloat(div.attr('data-lon'));

            console.log(div, fullAddress, latitude)
        
        //For each child gather the data including location and name of location, storing the data in an object like the examples above 
            let nameConcat = "visit_" + fullAddress;
            let myObject = {
                "id": fullAddress,
                "name": nameConcat,
                "address": {
                    "location_id": fullAddress,
                    "lon": longitude,
                    "lat": latitude
                }
            };
        
            //Push the object to an array declared before the while loop
            locationsArray.push(myObject)
            console.log(myObject)

            //Remove that child from parent container
            div.remove();
        }
    
    console.log(locationsArray);
    return locationsArray;
}

// Function to organise all the provided data so we can call the API
function launchOptimisationRequest() {
    //Fetch inputted data

    if(!$('#routeTitle').val()){
        $('#errorMsgDiv').append($('<p>').text('Route must have a name').css("color", "red"));
        return;
    }
    let routeName = $('#routeTitle').val();
    //listOfLocations needs to be changed
    let listOfLocations = createLocationsArray();
    let vehicleName = $('input[name="vehicleType"]:checked').attr("data-transport");
    let vehicleIcon = $('input[name="vehicleType"]:checked').attr("data-icon");
    let vehicleType = $('input[name="vehicleType"]:checked').attr("data-vehicleDesc");
    let roundTrip = $('input[name="routeType"]:checked').attr('data-val');
    console.log(roundTrip)
    

    //Store all data inside an object
    let routeInfo = {
        routeTitle: routeName,
        locations: listOfLocations,
        returnToStart: roundTrip,
        vehicle: vehicleName,
        vehicleIcon: vehicleIcon,
        vehicleType: vehicleType
    }

    if(!$('#roundTripCheck').is(':checked')){
        routeInfo.returnToStart = false;
    }

    console.log(routeInfo)
    
    fetchOptimizedRoute(routeInfo, true)
}

//Function to change which tab is active in the previous search panel
function changeActiveTab(event){
    let tabs = $('.panel-tabs').children();
    for(let i = 0; i < tabs.length; i++){
        $(tabs[i]).removeClass();
    }
    $(event.target).addClass('is-active')
    loadPreviousSearches();
}

//On change event for previous search input box to 
$('#searchPrev').on('keyup', function(){
    loadPreviousSearches();
})




//Function used to load previous searches saved in local storage and display them in the previous search panel
function loadPreviousSearches(){
    let previousSearches = JSON.parse(localStorage.getItem("previousSearches"));
    if(!previousSearches){
        return;
    }
    let previousSearchDiv = $('#previousSearchContent');
    previousSearchDiv.empty();
    let searchTerm = ""

    //Check if search term has been added
    if($('#searchPrev').val()){
         searchTerm = $('#searchPrev').val();
    }
    
    //Check which tab is active
    let activeTab = $('.panel-tabs').children('.is-active').text();

    
    //Load previous searches based on tab selected or search box
    
    for(let i = 0; i < previousSearches.length; i++){
        if(activeTab !== "All"){
            if(previousSearches[i].vehicleProfile !== activeTab.toLowerCase()){
                continue;
            }
        }
        console.log(previousSearches[i].routeName, searchTerm)
        if(!previousSearches[i].routeName.toLowerCase().includes(searchTerm.toLowerCase())){
            continue;
        }
        
        let div = $('<div>').addClass('is-flex is-align-items-center');
        let span = $('<span>').addClass('panel-icon');
        let icon = $('<i>').addClass(previousSearches[i].vehicleIcon);
        span.append(icon);
        let anchor = $('<a>').addClass('panel-block is-flex is-justify-content-space-between').attr('id', 'prevSearchLi')
        anchor.attr("data-all", JSON.stringify(previousSearches[i])).css('height', "50px")
        let text = $('<h5>').text(previousSearches[i].routeName).addClass('is-6 title');
        let button = $('<button>').addClass('button is-danger').text('Remove').attr('id', "removePrevious").on('click', removeSearch);

        div.append(span, text);
        anchor.append(div, button);
        previousSearchDiv.append(anchor);

        anchor.on("click", loadThisSearch);
    }


}

function loadThisSearch(event){
    let data = JSON.parse($(event.target).attr('data-all'));
    
    fetchOptimizedRoute(data.fetchStructure, false);
}

//Delete a selected previous search
function removeSearch(event){
    let removeText = $(event.target).siblings('div').children('p').text();

    let previousSearches = JSON.parse(localStorage.getItem('previousSearches'));

    for(let i = 0; i < previousSearches.length; i++){
        if(previousSearches[i].routeName === removeText){
            previousSearches.splice(i, 1);
        }
    }
    
    localStorage.setItem('previousSearches', JSON.stringify(previousSearches));

    loadPreviousSearches();
}

//Fetch the optimized route once provided with the location, vehicle type and return to origin
function fetchOptimizedRoute(routeInfo, addToLocal){
    $('#progressBar').css('display', "block");

    let vehicleTypeInfo = JSON.parse(routeInfo.vehicleType);

    let organisedData = {
        vehicles: [
            {
                vehicle_id: 'my_vehicle',
                type_id: routeInfo.vehicle,
                start_address: {
                    location_id: routeInfo.locations[0].name,
                    lon: routeInfo.locations[0].address.lon,
                    lat: routeInfo.locations[0].address.lat
                },
                return_to_depot: routeInfo.returnToOrigin
            }
        ],
        vehicle_types: [
            {
                profile: vehicleTypeInfo.profile,
                type_id: vehicleTypeInfo.type_id
            }
        ],
        services: [],
        configuration: {
            routing: {
                calc_points: true
            }
        }
    }

    for(let i = 1; i < routeInfo.locations.length; i++){
        organisedData.services.push(routeInfo.locations[i])
    }

    let fetchUrl = "https://graphhopper.com/api/1/vrp?key=4b8e0eda-a757-4baf-b8fd-63dcc8b828fe";

    console.log(organisedData);
    fetch(fetchUrl, {
        method: 'POST', //GET is the default.
        headers: {
            'Content-type': 'application/json'
        },
        body: JSON.stringify(organisedData)
    })
        .then(response => {
            if(!response.ok){

            }
            return response.json();
        })
        .then(data => {
            console.log(data);
            //load all necessary data into an object to be saved to local
            let newData = {
                routeName: routeInfo.routeTitle,
                travelDistance: data.solution.distance,
                numberOfRoutes: data.solution.routes[0].activities.length,
                cities: routeInfo.locations,
                routes: data.solution.routes[0].activities,
                routeLines: data.solution.routes[0].points,
                routes: data.solution.routes[0].activities,
                timeToTravel: data.solution.max_operation_time,
                vehicle: data.solution.routes[0].vehicle_id,
                vehicleIcon: routeInfo.vehicleIcon,
                vehicleType: routeInfo.vehicle,
                vehicleProfile: vehicleTypeInfo.profile,
                lengthOfTravel: data.solution.completion_time,
                totalDistance: data.solution.distance,
                vehicleProfile: vehicleTypeInfo.profile,
                fetchStructure: routeInfo
            };
            //Store into local
            let storeInLocal = JSON.parse(localStorage.getItem('previousSearches'));
            if(addToLocal == true){
                if(!storeInLocal){
                storeInLocal = [newData];
                localStorage.setItem("previousSearches", JSON.stringify(storeInLocal))
            } else{
                storeInLocal.push(newData);
                localStorage.setItem("previousSearches", JSON.stringify(storeInLocal))

                loadPreviousSearches();
            }
            }
            loadOptimisedRoute(newData)
        })
        .catch(error => {
            console.error("Error", error)
        })
}


let markerList = [];
let polylineList = [];

function loadOptimisedRoute(data){

    for(let i = 0; i< markerList.length; i++){
        markerList[i].remove();
        polylineList[i].remove();
    }
    

    //Set Heading and info
    $('#optimisedHeading').text(data.routeName);
    let totalKms = Math.floor(data.totalDistance / 1000)
    $('#totalKmsMain').text(totalKms)
    $('#transportTypeMain').text(data.vehicleProfile);
    let totalMinutes = data.lengthOfTravel / 60
    let totalHours = Math.floor(totalMinutes / 60);
    let remainingMinutes = Math.floor(totalMinutes % 60);
    console.log(totalHours, remainingMinutes)
    $('#travelTimeMain').text(totalHours + "H:" + remainingMinutes + "M");
    $('#stopsMain').text(data.routes.length);
    //Determine zoom on map
    let zoom;
    if(totalKms > 20000){
        zoom = 3
    }else if(totalKms > 10000){
        zoom = 4
    }else if(totalKms > 5000){
        zoom = 5
    }else if(totalKms > 1000){
        zoom = 7
    }else if(totalKms > 500){
        zoom = 8
    }else if(totalKms > 100){
        zoom = 10
    }else if(totalKms > 50){
        zoom = 12
    }else if(totalKms > 20){
        zoom = 13
    } else{
        zoom = 14
    }

    //Find average position to position map
    let latitudeAvg = 0;
    let longitudeAvg = 0;
    for(let i = 0; i < data.routes.length; i++){
        latitudeAvg = latitudeAvg + data.routes[i].address.lat
        longitudeAvg = longitudeAvg + data.routes[i].address.lon
    }
    latitudeAvg = latitudeAvg / data.routes.length;
    longitudeAvg = longitudeAvg / data.routes.length;

    mainMap.setView([latitudeAvg, longitudeAvg], zoom);

    let stops = $('#stopsInOrder')
    stops.empty()
    //Append divs containing information about order of route
    for(let i = 0; i < data.cities.length; i++){
        generateStop(i, i, data);

        if(data.cities.length == (i + 1) && data.fetchStructure.returnToStart == "true"){
            let iconDiv = $('<span>').addClass("icon is-large").append($('<i>').addClass('fa-solid fa-arrow-down has-text-white'));
            $('#stopsInOrder').append(iconDiv);
            generateStop(i, 0, data);
        } else if (data.cities.length != (i + 1)){
            let iconDiv = $('<span>').addClass("icon is-large").append($('<i>').addClass('fa-solid fa-arrow-down has-text-white'));
            $('#stopsInOrder').append(iconDiv);
        }
        

        //Add markers to map
        var marker = L.marker([data.routes[i].address.lat, data.routes[i].address.lon]).addTo(mainMap)
        markerList.push(marker);
        //Add popups
        if(i == 0){ 
            marker.bindPopup('Start Here').openPopup();
        }
        
        
    }
    
    //Organise polyline data to be added to map
    for(let j = 0; j < data.routeLines.length; j++){
    let latLng = []
        for(let i = 0; i < data.routeLines[j].coordinates.length; i++){
        let coord = []
        coord.push(data.routeLines[j].coordinates[i][1]);
        coord.push(data.routeLines[j].coordinates[i][0]);
        latLng.push(coord)
        }
    var polyline = L.polyline(latLng, {color: 'red'}).addTo(mainMap);
    polylineList.push(polyline);
    }
    
   $('#progressBar').css("display", "none")
}

function generateStop(position, num, data){
    let stopContainer =  $('<div>').addClass('is-flex is-align-items-center is-justify-content-center');
    let numberIconContainer = $('<span>').addClass('icon is-large is-align-self-flex-start').append($('<i>').addClass('has-text-white fa-solid fa-' + (position + 1)));
            
    let stopDiv = $('<div>').addClass('box blueDarkest').append($('<h6>').addClass('is-6 title has-text-white').text(data.cities[num].id));

    stopContainer.append(numberIconContainer, stopDiv)
    $('#stopsInOrder').append(stopContainer);

    
 }


//fetchOptimizedRoute(routeInfo);

loadPreviousSearches();


var mainMap = L.map('mainMap').setView([53.552, 9.999], 7);
//fetchOptimizedRoute(routeInfo);


L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'

}).addTo(mainMap);


