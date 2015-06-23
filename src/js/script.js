var firebase = new Firebase("https://tutor-on-the-go.firebaseio.com");

var substringMatcher = function (strs) {
  return function findMatches(q, cb) {
    var matches, substrRegex;
 
    // an array that will be populated with substring matches
    matches = [];
 
    // regex used to determine if a string contains the substring `q`
    substrRegex = new RegExp(q, 'i');
 
    // iterate through the pool of strings and for any string that
    // contains the substring `q`, add it to the `matches` array
    $.each(strs, function(i, str) {
      if (substrRegex.test(str)) {
        matches.push(str);
      }
    });
 
    cb(matches);
  };
};

var gradeToString = function (grade) {
	var arr = ["Freshman", "Sophomore", "Junior", "Senior"];
	return arr[grade - 9];
};

var checkAuth = function () {
	var authData = firebase.getAuth();
	if (!authData) {
		window.location.replace(config.baseURL);
	}
	return authData;
};

var subjects = [];
var tutors = [];
firebase.child("subjects").once("value", function (data) {
	subjects = data.val();

	$(".subject-input").typeahead({
		hint: false,
		highlight: true,
		minLength: 1
	},
	{
		name: "Subjects",
		source: substringMatcher(subjects)
	});
});
firebase.child("users").once("value", function (data) {
	tutors = data.val();
});

var authentication = (function () {
	var elements = {
		unauthNav: $("#nav-not-authenticated"),
		authNav: $("#nav-authenticated"),
		navUserName: $("#nav-user-name"),
		signupForm: $("#signup-form"),
		loginForm: $("#login-form")
	};
	var init = function () {
		var userData = firebase.getAuth();
		if (userData) {
			elements.unauthNav.hide();
			firebase.child("users").child(userData.uid).once("value", function (snapshot) {
				var data = snapshot.val();
				elements.navUserName.text(data.firstName + " " + data.lastName);
			});
		} else {
			elements.authNav.hide();
		}
		elements.signupForm.on("valid.fndtn.abide", function() {
			var data = $(this).serializeObject();
			signup(data);
		});
		elements.loginForm.on("valid.fndtn.abide", function() {
			var data = $(this).serializeObject();
			login(data);
		});
	};
	var login = function (data) {
		firebase.authWithPassword({
			email: data.email,
			password: data.password
		}, function(error, userData) {
			if (error) {
				console.log("Login Failed!", error);
			} else {
				goToURL("profile/");
			}
		});
	};
	var signup = function (data) {
		firebase.createUser({
			email: data.email,
			password: data.password
		}, function (error, userData) {
			if (error) {
				console.log("Error creating user: ", error);
			} else {
				var charge;
				switch (data.grade) {
					case "9": charge = 20; break;
					case "10": charge = 20; break;
					case "11": charge = 25; break;
					case "12": charge = 30; break;
				}
				console.log(data.grade);
				console.log(charge);
				firebase.child("users").child(userData.uid).set({
					firstName: data.firstName,
					lastName: data.lastName,
					grade: data.grade,
					subjects: "",
					charge: charge
				});
				login(data);
			}
		});
	};
	return {
		init: init
	};
})();

var home = (function () {
	var elements = {
		homeBanner: $(".home-banner"),
		subjectInput: $(".subject-input"),
		tutorsList: $(".tutors-list"),
		profileModal: $("#profile-modal"),
		contactModal: $("#contact-modal"),
		contactName: $("#contact-name"),
		username: $("#user-name"),
		grade: $("#user-grade"),
		charge: $("#user-charge"),
		summary: $("#user-summary"),
		bio: $("#user-bio"),
		subjects: $("#user-subjects")
	};
	var selectedTutor;
	var init = function () {
		elements.profileModal.find(".basic-info").click(function () {
			elements.profileModal.foundation("reveal", "close");
		});
		elements.subjectInput.on("typeahead:select", function(ev, suggestion) {
			elements.homeBanner.addClass("collapsed");
			$("body.home-page").addClass("dark");
			elements.tutorsList.empty().fadeOut(0).delay(400).fadeIn(400);
			for (var i in tutors) {
				var tutor = tutors[i];
				var tutorsSubject = false;
				for (var j in tutor.subjects) {
					if (tutor.subjects[j] === suggestion) {
						tutorsSubject = true;
					}
				}
				if (tutorsSubject) {
					var el =
					$('<div class="tutor-panel-wrapper">' +
						'<div class="tutor-panel">' +
							'<img src="http://ohiotheatretoledo.org/wp-content/themes/ohiotheatre/img/profile_placeholder.png" alt="" class="profile-picture">' +
							'<h3 class="tutor-name">' + tutor.firstName + ' ' + tutor.lastName + '</h3>' +
							'<p class="tutor-grade">' + gradeToString(tutor.grade) + '</p>' +
							'<ul class="row">' +
								'<li><span>$' + tutor.charge + '/h</span><label>Charge</label></li>' +
								'<li><span>0</span><label>Reviews</label></li>' +
							'</ul>' +
							'<p class="summary">' + tutor.summary + '</p>' +
							'<div><div class="button-wrapper"><button class="small radius view-profile-button" data-id="' + i + '">VIEW PROFILE</button></div>' +
							'<div class="button-wrapper"><button class="small radius success contact-me-button" data-id="' + i + '">CONTACT</button></div></div>' +
						'</div>' +
					'</div>');
					elements.tutorsList.append(el);
				}
			}
			$(".view-profile-button").click(function (e) {
				selectedTutor = tutors[$(this).data("id")];
				elements.profileModal.foundation("reveal", "open");
				elements.username.text(selectedTutor.firstName + " " + selectedTutor.lastName);
				elements.grade.text(gradeToString(selectedTutor.grade));
				elements.charge.text(selectedTutor.charge);
				if (selectedTutor.subjects !== "") {
					elements.subjects.text(selectedTutor.subjects.join(", "));
				}
				if (selectedTutor.summary) {
					elements.summary.text(selectedTutor.summary);
				}
				if (selectedTutor.bio) {
					elements.bio.text(selectedTutor.bio);
				}
				if (selectedTutor.availability) {
					for (var i in selectedTutor.availability) {
						var id = selectedTutor.availability[i];
						$(".selectable-grid-column[data-id='" + id + "']").addClass("selected");
					}
				}
			});
			$(".contact-button").click(function (e) {
				revealContactForm(selectedTutor);
			});
			$(".contact-me-button").click(function (e) {
				var tutor = tutors[$(this).data("id")];
				revealContactForm(tutor);
			});
		});
	};
	var revealContactForm = function (tutor) {
		elements.contactName.text("Contact " + tutor.firstName + " " + tutor.lastName);
		elements.contactModal.foundation("reveal", "open");
	};
	return {
		init: init
	};
})();

var profile = (function () {
	var elements = {
		username: $("#user-name"),
		grade: $("#user-grade"),
		summary: $("#user-summary"),
		bio: $("#user-bio"),
		subjects: $("#user-subjects"),
		charge: $("#user-charge"),
		logoutButton: $("#logout-button"),
		editBasicInfo: {
			modal: $("#edit-basic-info-modal"),
			form: $("#edit-basic-info-form"),
			firstName: $("#edit-first-name"),
			lastName: $("#edit-last-name"),
			grade: $("#edit-grade"),
			charge: $("#edit-charge")
		},
		editSubjects: {
			modal: $("#edit-subjects-modal"),
			form: $("#edit-subjects-form"),
			subjects: $("#edit-subjects"),
			addSubjectInput: $("#add-subject-input")
		},
		editBio: {
			modal: $("#edit-bio-modal"),
			form: $("#edit-bio-form"),
			summary: $("#edit-summary-textarea"),
			bio: $("#edit-bio-textarea")
		},
		editAvailability: {
			modal: $("#edit-availability-modal"),
			form: $("#edit-availability-form"),
			grid: $("#edit-availability-grid")
		}
	};
	var init = function () {
		var userData = checkAuth();
		var editableList = Sortable.create(document.getElementById("edit-subjects"), {
			filter: '.js-remove',
			animation: 150,
			onFilter: function (evt) {
				var el = editableList.closest(evt.item); // get dragged item
				el.parentNode.removeChild(el);
			}
		});
		firebase.child("users").child(userData.uid).once("value", function (snapshot) {
			var data = snapshot.val();
			setBasicInfo(data);
			setSubjects(data);
			setBio(data);
			setAvailability(data);
			elements.editBasicInfo.firstName.val(data.firstName);
			elements.editBasicInfo.lastName.val(data.lastName);
			elements.editBasicInfo.grade.val(data.grade);
			elements.editBasicInfo.charge.val(data.charge);
			elements.editBio.summary.val(data.summary);
			elements.editBio.bio.val(data.bio);
			for (var i in data.subjects) {
				elements.editSubjects.subjects.append(listItemForSubject(data.subjects[i]));
			}
		});
		elements.editBasicInfo.form.on("valid.fndtn.abide", function () {
			var data = elements.editBasicInfo.form.serializeObject();
			firebase.child("users").child(userData.uid).update(data);
			elements.editBasicInfo.modal.foundation('reveal', 'close');
			setBasicInfo(data);
		});
		elements.editSubjects.form.on("valid.fndtn.abide", function () {
			var data = {subjects: editableList.toArray()};
			firebase.child("users").child(userData.uid).update(data);
			elements.editSubjects.modal.foundation('reveal', 'close');
			setSubjects(data);
		});
		elements.editBio.form.on("valid.fndtn.abide", function () {
			var data = elements.editBio.form.serializeObject();
			firebase.child("users").child(userData.uid).update(data);
			elements.editBio.modal.foundation('reveal', 'close');
			setBio(data);
		});
		elements.editAvailability.form.on("valid.fndtn.abide", function () {
			var selectedElements = elements.editAvailability.grid.selectableGrid().selected();
			var arr = [];
			for (var i = 0; i < selectedElements.length; i++) {
				var val = $(selectedElements[i]).data("id");
				arr.push(val);
			}
			var data = {availability: arr};
			firebase.child("users").child(userData.uid).child("availability").set(data.availability);
			elements.editAvailability.modal.foundation('reveal', 'close');
			setAvailability(data);
		});
		$(".subject-input").on("typeahead:select", function(ev, suggestion) {
			ev.preventDefault();
			addSubject();
		});
		elements.logoutButton.click(function (e) {
			e.preventDefault();
			firebase.unauth();
			window.location.href = "../";
		});
	};
	var addSubject = function () {
		var subject = elements.editSubjects.addSubjectInput.val();
		elements.editSubjects.subjects.append(listItemForSubject(subject));
		elements.editSubjects.addSubjectInput.typeahead("val", "");
	};
	var listItemForSubject = function (subject) {
		return $("<li data-id='" + subject + "'>" + subject + "<i class='js-remove'>✖</i></li>");
	};
	var setBasicInfo = function (data) {
		elements.username.text(data.firstName + " " + data.lastName);
		elements.grade.text(gradeToString(data.grade));
		elements.charge.text(data.charge);
	};
	var setSubjects = function (data) {
		if (data.subjects) {
			elements.subjects.text(data.subjects.join(", "));
		}
	};
	var setBio = function (data) {
		elements.summary.text(data.summary);
		elements.bio.text(data.bio);
	};
	var setAvailability = function (data) {
		if (data.availability) {
			$(".selectable-grid-column").removeClass("selected");
			for (var i in data.availability) {
				var id = data.availability[i];
				$(".selectable-grid-column[data-id='" + id + "']").addClass("selected");
			}
		}
	};
	return {
		init: init
	};
})();

$(function() {
	var body = $("body");
	if (body.hasClass("home-page")) {
		authentication.init();
		home.init();
	}
	if (body.hasClass("profile-page")) {
		profile.init();
	}
});
