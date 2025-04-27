;; EcoWeave Project Management Contract
;; A decentralized platform for organizing and tracking community environmental clean-up projects

;; Error Codes
(define-constant ERR_UNAUTHORIZED (err u403))
(define-constant ERR_PROJECT_NOT_FOUND (err u404))
(define-constant ERR_PROJECT_EXISTS (err u409))
(define-constant ERR_PARTICIPANT_LIMIT_REACHED (err u429))
(define-constant ERR_INVALID_INPUT (err u400))
(define-constant ERR_DUPLICATE_REGISTRATION (err u422))
(define-constant ERR_PROJECT_NOT_ACTIVE (err u412))
(define-constant ERR_INSUFFICIENT_VOTES (err u415))

;; Project Status
(define-constant PROJECT_STATUS_PROPOSED u0)
(define-constant PROJECT_STATUS_ACTIVE u1)
(define-constant PROJECT_STATUS_COMPLETED u2)

;; Data Structures
(define-map projects
    {project-id: uint}
    {
        name: (string-utf8 100),
        description: (string-utf8 500),
        location: (string-utf8 200),
        target-area: (string-utf8 200),
        creator: principal,
        max-participants: uint,
        current-participants: uint,
        status: uint,
        completion-votes: uint
    }
)

(define-map project-participants
    {project-id: uint, participant: principal}
    {
        checked-in: bool,
        verified: bool
    }
)

;; Project ID Tracking
(define-data-var next-project-id uint u0)

;; Verification Threshold (e.g., 70% of participants must verify)
(define-constant VERIFICATION_THRESHOLD u70)

;; Project Creation
(define-public (create-project 
    (name (string-utf8 100))
    (description (string-utf8 500))
    (location (string-utf8 200))
    (target-area (string-utf8 200))
    (max-participants uint)
)
    (let 
        (
            (project-id (var-get next-project-id))
            (new-project {
                name: name,
                description: description,
                location: location,
                target-area: target-area,
                creator: tx-sender,
                max-participants: max-participants,
                current-participants: u0,
                status: PROJECT_STATUS_PROPOSED,
                completion-votes: u0
            })
        )
        ;; Input validation
        (asserts! (> (len name) u0) ERR_INVALID_INPUT)
        (asserts! (> (len description) u0) ERR_INVALID_INPUT)
        (asserts! (> max-participants u0) ERR_INVALID_INPUT)

        ;; Store project
        (map-set projects {project-id: project-id} new-project)
        
        ;; Increment project ID
        (var-set next-project-id (+ project-id u1))
        
        (ok project-id)
    )
)

;; Project Registration
(define-public (register-for-project (project-id uint))
    (let 
        (
            (project (unwrap! (map-get? projects {project-id: project-id}) ERR_PROJECT_NOT_FOUND))
            (current-participants (get current-participants project))
            (max-participants (get max-participants project))
        )
        ;; Validate project status and participant limit
        (asserts! (is-eq (get status project) PROJECT_STATUS_ACTIVE) ERR_PROJECT_NOT_ACTIVE)
        (asserts! (< current-participants max-participants) ERR_PARTICIPANT_LIMIT_REACHED)
        
        ;; Check for duplicate registration
        (asserts! 
            (is-none (map-get? project-participants {project-id: project-id, participant: tx-sender})) 
            ERR_DUPLICATE_REGISTRATION
        )

        ;; Register participant
        (map-set project-participants 
            {project-id: project-id, participant: tx-sender} 
            {checked-in: false, verified: false}
        )

        ;; Update project participant count
        (map-set projects 
            {project-id: project-id} 
            (merge project {current-participants: (+ current-participants u1)})
        )

        (ok true)
    )
)

;; Activate Project
(define-public (activate-project (project-id uint))
    (let 
        (
            (project (unwrap! (map-get? projects {project-id: project-id}) ERR_PROJECT_NOT_FOUND))
        )
        ;; Only project creator can activate
        (asserts! (is-eq tx-sender (get creator project)) ERR_UNAUTHORIZED)
        
        ;; Update project status
        (map-set projects 
            {project-id: project-id} 
            (merge project {status: PROJECT_STATUS_ACTIVE})
        )

        (ok true)
    )
)

;; Check-in for Project
(define-public (check-in (project-id uint))
    (let 
        (
            (registration (unwrap! 
                (map-get? project-participants {project-id: project-id, participant: tx-sender}) 
                ERR_UNAUTHORIZED
            ))
        )
        ;; Mark participant as checked-in
        (map-set project-participants 
            {project-id: project-id, participant: tx-sender} 
            (merge registration {checked-in: true})
        )

        (ok true)
    )
)

;; Vote for Project Completion
(define-public (vote-project-completion (project-id uint))
    (let 
        (
            (project (unwrap! (map-get? projects {project-id: project-id}) ERR_PROJECT_NOT_FOUND))
            (registration (unwrap! 
                (map-get? project-participants {project-id: project-id, participant: tx-sender}) 
                ERR_UNAUTHORIZED
            ))
            (current-votes (get completion-votes project))
        )
        ;; Participant must be checked-in
        (asserts! (get checked-in registration) ERR_UNAUTHORIZED)
        
        ;; Mark voter as verified
        (map-set project-participants 
            {project-id: project-id, participant: tx-sender} 
            (merge registration {verified: true})
        )

        ;; Update project completion votes
        (map-set projects 
            {project-id: project-id} 
            (merge project {completion-votes: (+ current-votes u1)})
        )

        ;; Check if project can be marked complete
        (if (>= 
            (/ (* (get completion-votes project) u100) 
               (get current-participants project))
            VERIFICATION_THRESHOLD)
            ;; Mark project as completed
            (map-set projects 
                {project-id: project-id} 
                (merge project {status: PROJECT_STATUS_COMPLETED})
            )
            true
        )

        (ok true)
    )
)

;; Read-only Functions for Project Information
(define-read-only (get-project-details (project-id uint))
    (map-get? projects {project-id: project-id})
)

(define-read-only (get-participant-status (project-id uint) (participant principal))
    (map-get? project-participants {project-id: project-id, participant: participant})
)